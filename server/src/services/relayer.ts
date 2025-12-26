import { createPublicClient, createWalletClient, getAddress, http } from 'viem';
import { defineChain } from 'viem/utils';
import { privateKeyToAccount } from 'viem/accounts';
import type { Address } from 'viem';

import { getEscrowAddress } from './escrowContract';

// Minimal ABI for Merkle settlement finalize (already used by the client)
const ESCROW_MERKLE_ABI = [
  {
    type: 'function',
    name: 'postSettlementRoot',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'predictionId', type: 'bytes32' },
      { name: 'root', type: 'bytes32' },
      { name: 'creator', type: 'address' },
      { name: 'creatorFee', type: 'uint256' },
      { name: 'platform', type: 'address' },
      { name: 'platformFee', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

function toBytes32FromUuid(uuid: string): `0x${string}` {
  const hex = uuid.replace(/-/g, '').toLowerCase().padEnd(64, '0');
  return `0x${hex}` as const;
}

function getRelayerConfig() {
  const pk = process.env.RELAYER_PRIVATE_KEY;
  const rpcUrl = process.env.RELAYER_RPC_URL;
  const chainId = Number(process.env.RELAYER_CHAIN_ID || '0');

  if (!pk || !rpcUrl || !chainId) {
    throw new Error('Relayer not configured');
  }

  return { pk, rpcUrl, chainId };
}

function getRelayerChain(chainId: number, rpcUrl: string) {
  return defineChain({
    id: chainId,
    name: chainId === 8453 ? 'Base' : 'Base Sepolia',
    network: chainId === 8453 ? 'base' : 'base-sepolia',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] }, public: { http: [rpcUrl] } },
  });
}

export function getRelayerSigner() {
  const { pk, rpcUrl, chainId } = getRelayerConfig();
  const chain = getRelayerChain(chainId, rpcUrl);
  const account = privateKeyToAccount(pk as `0x${string}`);

  const walletClient = createWalletClient({
    chain,
    transport: http(rpcUrl),
    account,
  });

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  return { account, walletClient, publicClient, chainId };
}

export async function submitFinalizeTx(args: {
  predictionId: string;
  merkleRoot: `0x${string}`;
  creatorAddress: `0x${string}`;
  creatorFeeUnits: bigint;
  platformAddress: `0x${string}`;
  platformFeeUnits: bigint;
}): Promise<{ txHash: `0x${string}`; escrowAddress: Address }> {
  const { walletClient, publicClient } = getRelayerSigner();
  const escrowAddress = await getEscrowAddress();

  const txHash = await walletClient.writeContract({
    address: escrowAddress,
    abi: ESCROW_MERKLE_ABI,
    functionName: 'postSettlementRoot',
    args: [
      toBytes32FromUuid(args.predictionId),
      args.merkleRoot,
      getAddress(args.creatorAddress),
      args.creatorFeeUnits,
      getAddress(args.platformAddress),
      args.platformFeeUnits,
    ],
  } as any);

  // Wait for confirmation (1 block)
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });
  if ((receipt as any).status !== 'success') {
    throw new Error('Finalize transaction reverted');
  }

  return { txHash, escrowAddress };
}



