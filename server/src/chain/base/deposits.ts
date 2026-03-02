import type { Address, Log } from 'viem';
import { makePublicClient } from './client';
import { ERC20_ABI } from './abi/erc20';
import { Pool } from 'pg';
import { emitWalletUpdate } from '../../services/realtime';

type Ctx = {
  pool: Pool;
  usdc: Address;
};

// Base Sepolia RPC enforces an eth_getLogs block span limit (~10,000).
// Keep a safety margin because the range is inclusive.
const MAX_GET_LOGS_BLOCK_SPAN = 9_500n;

function envOn(): boolean {
  return process.env.PAYMENTS_ENABLE === '1' && process.env.ENABLE_BASE_DEPOSITS === '1';
}

export async function startBaseDepositWatcher(ctx: Ctx) {
  if (!envOn()) {
    console.warn('[FCZ-PAY] base deposits disabled by flags');
    return;
  }
  
  if (!process.env.RPC_URL || !process.env.CHAIN_ID || !process.env.USDC_ADDRESS) {
    console.warn('[FCZ-PAY] base deposits misconfigured (RPC_URL/CHAIN_ID/USDC_ADDRESS). Watcher not started.');
    return;
  }

  const client = makePublicClient();
  const usdc = ctx.usdc;

  console.log('[FCZ-PAY] Starting HTTP polling mode (more reliable than WebSocket)...');
  let fromBlock: bigint | undefined;

  const fetchTransferLogsChunked = async (start: bigint, end: bigint) => {
    const out: Log[] = [];
    let cursor = start;
    while (cursor <= end) {
      const chunkEnd = cursor + MAX_GET_LOGS_BLOCK_SPAN < end
        ? cursor + MAX_GET_LOGS_BLOCK_SPAN
        : end;
      const chunkLogs = await client.getLogs({
        address: usdc,
        event: { type: 'event', name: 'Transfer', inputs: ERC20_ABI[0].inputs as any },
        fromBlock: cursor,
        toBlock: chunkEnd
      });
      if (chunkLogs.length > 0) {
        console.log(`[FCZ-PAY] Found ${chunkLogs.length} Transfer events in chunk ${cursor}-${chunkEnd}`);
      }
      out.push(...(chunkLogs as any));
      cursor = chunkEnd + 1n;
    }
    return out;
  };
  
  const poll = async () => {
    try {
      const latest = await client.getBlockNumber();
      const start = fromBlock ? fromBlock : latest - 1000n > 0n ? latest - 1000n : 0n;
      
      console.log(`[FCZ-PAY] Polling blocks ${start} to ${latest}...`);
      
      const logs = await fetchTransferLogsChunked(start, latest);
      
      if (logs.length > 0) {
        console.log(`[FCZ-PAY] Found ${logs.length} Transfer events`);
      }
      
      await processTransferLogs(ctx, logs as any);
      fromBlock = latest + 1n;
    } catch (e) {
      console.error('[FCZ-PAY] polling error', e);
    } finally {
      setTimeout(poll, 10_000); // Poll every 10 seconds
    }
  };
  
  // Do initial scan immediately
  poll();
  console.log('[FCZ-PAY] Base USDC watcher started (HTTP polling mode).');
}

async function processTransferLogs(ctx: Ctx, logs: Log[]) {
  if (!logs.length) return;

  console.log(`[FCZ-PAY] Processing ${logs.length} transfer logs...`);

  // Only care about transfers TO known deposit addresses
  // Build a set of "to" addresses -> then resolve users once to reduce DB chatter
  const tos = new Set<string>();
  for (const l of logs) {
    const args: any = (l as any).args;
    const to = String(args?.to ?? '').toLowerCase();
    if (to) tos.add(to);
  }
  
  console.log(`[FCZ-PAY] Found ${tos.size} unique recipient addresses`);
  if (tos.size === 0) return;

  const client = await ctx.pool.connect();
  
  try {
    const { rows: addrRows } = await client.query(
      `SELECT lower(address) AS address, user_id
       FROM crypto_addresses
       WHERE lower(address) = ANY($1)`,
      [Array.from(tos)]
    );
    
    console.log(`[FCZ-PAY] Found ${addrRows.length} matching deposit addresses in database`);
    
    if (addrRows.length === 0) {
      console.log('[FCZ-PAY] No matching deposit addresses found');
      return;
    }

    const toUser = new Map<string, string>();
    for (const r of addrRows) {
      toUser.set(r.address, r.user_id);
      console.log(`[FCZ-PAY] Registered deposit address: ${r.address} -> user ${r.user_id}`);
    }

    await client.query('BEGIN');

    for (const l of logs) {
      const txHash = String((l as any).transactionHash);
      const logIndex = Number((l as any).logIndex ?? 0);
      const args: any = (l as any).args;
      const to = String(args?.to ?? '').toLowerCase();
      const value = BigInt(args?.value ?? 0n);

      const userId = toUser.get(to);
      if (!userId || value <= 0n) continue;

      // Convert to numeric dollars from 6-decimals USDC (store as numeric)
      const amount = Number(value) / 1_000_000; // USDC has 6 decimals

      console.log(`[FCZ-PAY] Processing deposit: ${amount} USDC to user ${userId} (tx: ${txHash}:${logIndex})`);

      // Idempotent insert into wallet_transactions; if exists, skip
      await client.query(
        `INSERT INTO wallet_transactions
           (user_id, direction, type, channel, provider, amount, status, external_ref, description, meta)
         VALUES ($1,'credit','credit','escrow_deposit','crypto-base-usdc',$2,'success',$3,$4,$5)
         ON CONFLICT (provider, external_ref) DO NOTHING`,
        [userId, amount, `${txHash}:${logIndex}`, 'Base USDC deposit detected', JSON.stringify({ txHash, logIndex })]
      );

      // Update wallet available_balance if this is the first time we see this tx
      const { rowCount } = await client.query(
        `UPDATE wallets
            SET available_balance = available_balance + $1,
                updated_at = now()
          WHERE user_id = $2
            AND NOT EXISTS (
              SELECT 1 FROM wallet_transactions
              WHERE provider='crypto-base-usdc' AND external_ref=$3 AND user_id=$2 AND status='success'
            )`,
        [amount, userId, `${txHash}:${logIndex}`]
      );

      // Always log event for audit
      await client.query(
        `INSERT INTO event_log (source, kind, ref, payload)
         VALUES ('base-watcher','deposit',$1, $2)`,
        [`${txHash}:${logIndex}`, JSON.stringify({ userId, to, amount })]
      );

      console.log(`[FCZ-PAY] ✅ Credited user ${userId} with ${amount} USDC`);
      try { emitWalletUpdate({ userId, reason: 'deposit_detected', amountDelta: amount }); } catch {}
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[FCZ-PAY] processTransferLogs error', e);
  } finally {
    client.release();
  }
}
