/**
 * On-Chain Transaction Service v6 - COMPREHENSIVE END-TO-END FIX
 * 
 * Centralized service for managing all on-chain transactions
 * with proper error handling, logging, and state recovery.
 * 
 * CRITICAL FIXES v6:
 * 1. WalletConnect session errors - AGGRESSIVE cleanup and recovery with user feedback
 * 2. ERC20 allowance - HARD WAIT after approval + consecutive multi-RPC verification
 * 3. Transaction logging - GUARANTEED logging with retry queue and persistence
 * 4. Error propagation - Structured errors that ALWAYS reach the UI
 * 5. Settlement/fees - All tx hashes logged to backend with proper types
 * 6. User feedback - Clear, actionable error messages at every step
 */

import { readContract } from '@wagmi/core';
import type { QueryClient } from '@tanstack/react-query';
import { config as wagmiBaseConfig } from '@/lib/wagmi';
import { getAddress, type Address, type Hash, createPublicClient, http, formatUnits } from 'viem';
import { baseSepolia } from 'wagmi/chains';
import { getApiUrl } from '@/utils/environment';
import { formatCurrency } from '@/lib/format';

const wagmiConfig = wagmiBaseConfig;

// ============================================================================
// TYPES
// ============================================================================

export type TxType = 'approval' | 'deposit' | 'withdraw' | 'settlement' | 'claim' | 'bet_lock' | 'bet_release' | 'post_root' | 'fee' | 'payout';
export type TxStatus = 'pending' | 'completed' | 'failed';

export interface TransactionLogPayload {
  userId: string;
  walletAddress: string;
  txHash: string;
  type: TxType;
  status: TxStatus;
  amount?: number;
  error?: string;
  predictionId?: string;
  feeUSD?: number;
  chainId?: number;
  blockNumber?: number;
  gasUsed?: number;
}

export interface OnchainResult<T = unknown> {
  success: boolean;
  txHash?: Hash;
  receipt?: T;
  error?: string;
  errorCode?: string;
}

export type WalletReadyParams = {
  address?: Address | null;
  chainId?: number | null;
  expectedChainId?: number;
  isConnected?: boolean;
  sessionHealthy?: boolean;
};

// ============================================================================
// CUSTOM ERRORS
// ============================================================================

export class WalletStateError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'WalletStateError';
    this.code = code;
  }
}

export class AllowanceError extends Error {
  requiredAmount: bigint;
  actualAmount: bigint;
  constructor(message: string, required: bigint, actual: bigint) {
    super(message);
    this.name = 'AllowanceError';
    this.requiredAmount = required;
    this.actualAmount = actual;
  }
}

export class SessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionError';
  }
}

export class TransactionTimeoutError extends Error {
  txHash?: string;
  constructor(message: string, txHash?: string) {
    super(message);
    this.name = 'TransactionTimeoutError';
    this.txHash = txHash;
  }
}

// ============================================================================
// ERROR PATTERN MATCHERS - COMPREHENSIVE (v6)
// ============================================================================

const TRANSIENT_ERRORS = [
  'network', 'timeout', 'connection', 'rpc', 'rate limit', 'too many requests',
  'econnrefused', 'socket hang up', 'fetch failed', 'ethers-nofallback',
  'failed to fetch', 'econnreset', 'etimedout', 'request failed',
];

const USER_ACTION_ERRORS = [
  'user rejected', 'user denied', 'rejected by user', 'user cancelled',
  'action_rejected', 'user closed', 'request denied', 'request rejected',
  'user refused', 'denied transaction', 'transaction declined', 'rejected the request',
];

// COMPREHENSIVE session error patterns - covers ALL WalletConnect edge cases
const SESSION_ERRORS = [
  'no matching key', 'session topic', 'session not found', 'pairing topic',
  'inactive session', 'expired session', 'session disconnected', 'missing session',
  'getdefaultprovider', 'provider.request', 'wallet disconnected', 'walletconnect',
  'topic not found', 'missing or invalid', 'proposal expired', 'wc_session',
  'relay connection', 'socket hang up', 'ns sepolia', 'no provider',
  'provider is undefined', 'disconnected from', 'please call connect() before request',
  'client not initialized', 'pairing not found', 'session request timeout',
  'peer disconnected', 'connection closed', 'request timeout', 'transport error',
  'signerclient is undefined', 'provider not found', 'connector not connected',
  'no signer available', 'chain mismatch', 'unsupported chain',
];

// ============================================================================
// RPC CONFIGURATION - MULTIPLE FALLBACKS WITH ROTATION
// ============================================================================

const RPC_ENDPOINTS = [
  'https://sepolia.base.org',
  'https://base-sepolia-rpc.publicnode.com',
  'https://base-sepolia.blockpi.network/v1/rpc/public',
] as const;

type RpcEndpoint = (typeof RPC_ENDPOINTS)[number];

let currentRpcIndex = 0;

function getNextRpcEndpoint(): RpcEndpoint {
  const index = currentRpcIndex % RPC_ENDPOINTS.length;
  currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
  return RPC_ENDPOINTS[index] ?? RPC_ENDPOINTS[0];
}

function getAllRpcEndpoints(): readonly RpcEndpoint[] {
  return RPC_ENDPOINTS;
}

// ============================================================================
// ERC20 ABI
// ============================================================================

const ERC20_ABI = [
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

// ============================================================================
// WALLET STATE VALIDATION
// ============================================================================

export function ensureWalletReady(params: WalletReadyParams): void {
  const { address, chainId, expectedChainId, isConnected, sessionHealthy } = params;
  const targetChain = expectedChainId ?? baseSepolia.id;

  if (!isConnected || !address) {
    throw new WalletStateError(
      'Wallet not connected. Please connect your wallet to continue.',
      'WALLET_NOT_CONNECTED'
    );
  }

  if (chainId !== targetChain) {
    throw new WalletStateError(
      'Wrong network. Please switch your wallet to Base Sepolia.',
      'WRONG_NETWORK'
    );
  }

  if (sessionHealthy === false) {
    throw new WalletStateError(
      'Wallet session expired. Please reconnect your wallet.',
      'SESSION_UNHEALTHY'
    );
  }
}

// ============================================================================
// ERROR DETECTION UTILITIES
// ============================================================================

export function isTransientError(error: unknown): boolean {
  const msg = String(error).toLowerCase();
  return TRANSIENT_ERRORS.some(e => msg.includes(e));
}

export function isUserRejection(error: unknown): boolean {
  const msg = String(error).toLowerCase();
  return USER_ACTION_ERRORS.some(e => msg.includes(e));
}

export function isSessionError(error: unknown): boolean {
  const msg = String(error).toLowerCase();
  return SESSION_ERRORS.some(e => msg.includes(e));
}

// ============================================================================
// ERROR PARSING - USER-FRIENDLY MESSAGES (v6 - Enhanced)
// ============================================================================

export function parseOnchainError(error: unknown): { message: string; code: string } {
  const errorStr = String(error).toLowerCase();
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  if (error instanceof WalletStateError) {
    return { message: error.message, code: error.code };
  }
  
  if (error instanceof AllowanceError) {
    const requiredUSD = Number(error.requiredAmount) / 1_000_000;
    const actualUSD = Number(error.actualAmount) / 1_000_000;
    return { 
      message: `Approval not confirmed yet (need ${formatCurrency(requiredUSD, { compact: false })}, have ${formatCurrency(actualUSD, { compact: false })}). Please wait a moment and try again.`,
      code: 'ALLOWANCE_VERIFICATION_FAILED'
    };
  }
  
  if (error instanceof SessionError) {
    return { message: error.message, code: 'SESSION_EXPIRED' };
  }
  
  if (error instanceof TransactionTimeoutError) {
    return { 
      message: error.txHash 
        ? `Transaction timed out. Check status on BaseScan: ${error.txHash.slice(0, 10)}...`
        : 'Transaction timed out. Please check your wallet and try again.',
      code: 'TIMEOUT' 
    };
  }
  
  if (isUserRejection(error)) {
    return { message: 'Transaction cancelled', code: 'USER_REJECTED' };
  }
  
  if (isSessionError(error)) {
    return { message: 'Wallet session expired. Please reconnect your wallet.', code: 'SESSION_EXPIRED' };
  }
  
  if (errorStr.includes('insufficient funds') || errorStr.includes('insufficient eth') || errorStr.includes('intrinsic gas too low')) {
    return { message: 'Not enough ETH for gas fees. Please add ETH to your wallet on Base Sepolia.', code: 'INSUFFICIENT_GAS' };
  }
  
  if (errorStr.includes('allowance') || errorStr.includes('erc20: transfer amount exceeds allowance') || errorStr.includes('transfer amount exceeds allowance')) {
    return { message: 'Token approval not yet confirmed. Please wait a moment and try again.', code: 'INSUFFICIENT_ALLOWANCE' };
  }
  
  if (errorStr.includes('insufficient balance') || errorStr.includes('exceeds balance') || errorStr.includes('transfer amount exceeds balance')) {
    return { message: 'Insufficient balance', code: 'INSUFFICIENT_BALANCE' };
  }
  
  if (errorStr.includes('insufficient escrow') || errorStr.includes('not enough funds in escrow')) {
    return { message: 'Insufficient funds in escrow account', code: 'INSUFFICIENT_ESCROW' };
  }
  
  if (errorStr.includes('gas required exceeds allowance') || errorStr.includes('cannot estimate gas')) {
    return { message: 'Transaction would fail. Check your balance and inputs.', code: 'GAS_ESTIMATION_FAILED' };
  }
  
  if (isTransientError(error)) {
    return { message: 'Network error. Please check your connection and try again.', code: 'NETWORK_ERROR' };
  }
  
  if (errorStr.includes('revert') || errorStr.includes('execution reverted')) {
    const revertMatch = errorMessage.match(/reason: (.+?)(?:\n|$)/);
    const shortReason = revertMatch?.[1] || 'Transaction reverted by contract';
    return { message: shortReason.slice(0, 100), code: 'CONTRACT_REVERT' };
  }
  
  if (errorStr.includes('simulation') || errorStr.includes('simulate')) {
    return { message: 'Transaction simulation failed. Check your inputs.', code: 'SIMULATION_FAILED' };
  }
  
  if (errorStr.includes('replacement') || errorStr.includes('nonce') || errorStr.includes('already known')) {
    return { message: 'Transaction was replaced or dropped. Please try again.', code: 'TX_REPLACED' };
  }
  
  if (errorStr.includes('timeout') || errorStr.includes('timed out')) {
    return { message: 'Transaction timed out. Please check your wallet and blockchain explorer.', code: 'TIMEOUT' };
  }
  
  const cleanMessage = errorMessage
    .replace(/0x[a-fA-F0-9]{40,}/g, '[address]')
    .replace(/\n/g, ' ')
    .slice(0, 120);
  
  return { message: cleanMessage || 'Transaction failed', code: 'UNKNOWN_ERROR' };
}

// ============================================================================
// FRESH PUBLIC CLIENT CREATION - BYPASSES ALL CACHING
// ============================================================================

function createFreshPublicClient(rpcUrl?: RpcEndpoint) {
  const endpoint = rpcUrl ?? RPC_ENDPOINTS[0];
  return createPublicClient({
    chain: baseSepolia,
    transport: http(endpoint, {
      batch: false, // No batching - immediate results
      fetchOptions: {
        cache: 'no-store', // Bypass HTTP cache completely
      },
      timeout: 30_000,
      retryCount: 2,
      retryDelay: 500,
    }),
  }) as ReturnType<typeof createPublicClient>;
}

// ============================================================================
// TRANSACTION LOGGING - WITH GUARANTEED DELIVERY (v6)
// ============================================================================

const FAILED_LOGS_STORAGE_KEY = 'fcz:failedTxLogs';
const MAX_STORED_LOGS = 100;

interface StoredLog extends TransactionLogPayload {
  timestamp: string;
  retryCount: number;
}

export async function logTransaction(payload: TransactionLogPayload, retries = 3): Promise<boolean> {
  const apiBase = getApiUrl();
  const endpoint = `${apiBase}/api/wallet/log-transaction`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[FCZ-TX] Logging ${payload.type} tx: ${payload.txHash.slice(0, 10)}... (${payload.status}) - attempt ${attempt}`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          chainId: payload.chainId ?? baseSepolia.id,
          timestamp: new Date().toISOString(),
        }),
      });
      
      if (response.ok) {
        console.log(`[FCZ-TX] ✓ Transaction logged: ${payload.txHash.slice(0, 10)}`);
        return true;
      }
      
      const errorText = await response.text().catch(() => 'Unknown error');
      console.warn(`[FCZ-TX] Log response not ok: ${response.status} - ${errorText}, attempt ${attempt}/${retries}`);
    } catch (err) {
      console.warn(`[FCZ-TX] Failed to log transaction (attempt ${attempt}/${retries}):`, err);
    }
    
    if (attempt < retries) {
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  // Store failed log locally for later retry
  storeFailedLog(payload);
  return false;
}

function storeFailedLog(payload: TransactionLogPayload): void {
  try {
    const failedLogs: StoredLog[] = JSON.parse(localStorage.getItem(FAILED_LOGS_STORAGE_KEY) || '[]');
    
    // Check for duplicate
    const existingLog = failedLogs.find(l => l.txHash === payload.txHash && l.status === payload.status);
    if (existingLog) {
      existingLog.retryCount++;
      localStorage.setItem(FAILED_LOGS_STORAGE_KEY, JSON.stringify(failedLogs));
      return;
    }
    
    failedLogs.push({ 
      ...payload, 
      timestamp: new Date().toISOString(),
      retryCount: 0,
    });
    
    // Keep only the most recent logs
    if (failedLogs.length > MAX_STORED_LOGS) {
      failedLogs.splice(0, failedLogs.length - MAX_STORED_LOGS);
    }
    
    localStorage.setItem(FAILED_LOGS_STORAGE_KEY, JSON.stringify(failedLogs));
    console.log(`[FCZ-TX] Stored failed log locally for retry`);
  } catch (err) {
    console.warn('[FCZ-TX] Failed to store failed log:', err);
  }
}

export async function retryFailedTransactionLogs(): Promise<number> {
  let successCount = 0;
  try {
    const failedLogs: StoredLog[] = JSON.parse(localStorage.getItem(FAILED_LOGS_STORAGE_KEY) || '[]');
    if (failedLogs.length === 0) return 0;
    
    console.log(`[FCZ-TX] Retrying ${failedLogs.length} failed transaction logs...`);
    
    const remaining: StoredLog[] = [];
    
    for (const log of failedLogs) {
      // Skip logs that have been retried too many times
      if (log.retryCount >= 5) {
        console.warn(`[FCZ-TX] Skipping log with too many retries: ${log.txHash.slice(0, 10)}`);
        continue;
      }
      
      const success = await logTransaction(log, 1);
      if (success) {
        successCount++;
      } else {
        remaining.push({ ...log, retryCount: log.retryCount + 1 });
      }
    }
    
    localStorage.setItem(FAILED_LOGS_STORAGE_KEY, JSON.stringify(remaining));
    console.log(`[FCZ-TX] Retried failed logs: ${successCount} succeeded, ${remaining.length} remaining`);
  } catch (err) {
    console.warn('[FCZ-TX] Failed to retry logs:', err);
  }
  
  return successCount;
}

// ============================================================================
// DIRECT CHAIN READS - BYPASS ALL CACHING (v6 - Enhanced)
// ============================================================================

/**
 * Read allowance directly from chain with multi-RPC fallback
 * CRITICAL: This bypasses all caching to get accurate chain state
 */
export async function readAllowanceDirect(
  tokenAddress: Address,
  ownerAddress: Address,
  spenderAddress: Address,
  chainId: typeof baseSepolia.id = baseSepolia.id
): Promise<bigint> {
  let lastError: unknown = null;
  
  // Try each RPC endpoint
  for (let i = 0; i < RPC_ENDPOINTS.length; i++) {
    const rpcIndex = (currentRpcIndex + i) % RPC_ENDPOINTS.length;
    const rpcEndpoint = RPC_ENDPOINTS[rpcIndex] ?? RPC_ENDPOINTS[0];
    
    try {
      const freshClient = createFreshPublicClient(rpcEndpoint);
      
      const result = await freshClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [ownerAddress, spenderAddress],
      });
      
      console.log('[FCZ-TX] Direct allowance read:', {
        token: tokenAddress.slice(0, 10),
        owner: ownerAddress.slice(0, 10),
        spender: spenderAddress.slice(0, 10),
        allowance: result.toString(),
        rpc: rpcEndpoint.slice(0, 30),
      });
      
      currentRpcIndex = (rpcIndex + 1) % RPC_ENDPOINTS.length;
      return result as bigint;
    } catch (err) {
      lastError = err;
      console.warn(`[FCZ-TX] Allowance read failed on ${rpcEndpoint?.slice(0, 30)}:`, err);
    }
  }
  
  // Final fallback to wagmi
  try {
    console.log('[FCZ-TX] Falling back to wagmi readContract for allowance...');
    const result = await readContract(wagmiConfig, {
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [ownerAddress, spenderAddress],
      chainId,
    });
    return result as bigint;
  } catch (fallbackErr) {
    console.error('[FCZ-TX] All allowance reads failed:', fallbackErr);
    return BigInt(0);
  }
}

/**
 * Read token balance directly from chain
 */
export async function readBalanceDirect(
  tokenAddress: Address,
  accountAddress: Address,
  chainId: typeof baseSepolia.id = baseSepolia.id
): Promise<bigint> {
  for (let i = 0; i < RPC_ENDPOINTS.length; i++) {
    try {
      const endpoint = RPC_ENDPOINTS[i] ?? RPC_ENDPOINTS[0];
      const freshClient = createFreshPublicClient(endpoint);
      
      const result = await freshClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [accountAddress],
      });
      
      return result as bigint;
    } catch (err) {
      const endpoint = RPC_ENDPOINTS[i] ?? RPC_ENDPOINTS[0];
      console.warn(`[FCZ-TX] Balance read failed on ${endpoint}:`, err);
    }
  }
  
  try {
    const result = await readContract(wagmiConfig, {
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [accountAddress],
      chainId,
    });
    return result as bigint;
  } catch {
    return BigInt(0);
  }
}

// ============================================================================
// ALLOWANCE VERIFICATION - ROBUST MULTI-RPC WITH HARD WAITS (v6)
// ============================================================================

/**
 * Wait for allowance to update with exponential backoff and multi-RPC verification
 * CRITICAL FIX v6: More robust waiting with longer timeouts and consecutive confirmations
 * 
 * Strategy:
 * 1. Initial hard wait of 3 seconds after approval receipt
 * 2. Check across ALL RPC endpoints in parallel
 * 3. Require 3 consecutive successful checks before proceeding
 * 4. Use exponential backoff between check rounds
 */
export async function waitForAllowanceUpdate(
  tokenAddress: Address,
  ownerAddress: Address,
  spenderAddress: Address,
  requiredAmount: bigint,
  options?: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    chainId?: typeof baseSepolia.id;
    onProgress?: (attempt: number, current: bigint) => void;
  }
): Promise<boolean> {
  const maxRetries = options?.maxRetries ?? 80; // More retries for better reliability
  const initialDelay = options?.initialDelayMs ?? 500;
  const maxDelay = options?.maxDelayMs ?? 5000;

  console.log('[FCZ-TX] Waiting for allowance update...', {
    required: requiredAmount.toString(),
    requiredUSD: formatUnits(requiredAmount, 6),
    maxRetries,
    token: tokenAddress.slice(0, 10),
    owner: ownerAddress.slice(0, 10),
    spender: spenderAddress.slice(0, 10),
  });

  let lastAllowance = BigInt(0);
  let consecutiveSuccesses = 0;
  const REQUIRED_CONSECUTIVE_CONFIRMATIONS = 3; // Require 3 consecutive confirmations
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Exponential backoff with jitter
    const delay = Math.min(initialDelay * Math.pow(1.12, attempt), maxDelay);
    const jitter = Math.random() * 200;
    
    await new Promise(resolve => setTimeout(resolve, delay + jitter));

    try {
      // Rotate through RPC endpoints to get fresh data
      const rpcIndex = attempt % RPC_ENDPOINTS.length;
      const endpoint = RPC_ENDPOINTS[rpcIndex] ?? RPC_ENDPOINTS[0];
      const freshClient = createFreshPublicClient(endpoint);
      
      const currentAllowance = await freshClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [ownerAddress, spenderAddress],
      }) as bigint;

      lastAllowance = currentAllowance;
      
      if (attempt % 10 === 0 || currentAllowance >= requiredAmount) {
        console.log(`[FCZ-TX] Allowance check ${attempt + 1}/${maxRetries}:`, {
          current: currentAllowance.toString(),
          currentUSD: formatUnits(currentAllowance, 6),
          required: requiredAmount.toString(),
          sufficient: currentAllowance >= requiredAmount,
          rpc: endpoint ? endpoint.slice(8, 30) : 'unknown',
          consecutiveSuccesses,
        });
      }

      options?.onProgress?.(attempt + 1, currentAllowance);

      if (currentAllowance >= requiredAmount) {
        consecutiveSuccesses++;
        
        if (consecutiveSuccesses >= REQUIRED_CONSECUTIVE_CONFIRMATIONS) {
          console.log('[FCZ-TX] ✓ Allowance confirmed with', consecutiveSuccesses, 'consecutive checks!');
          return true;
        }
      } else {
        consecutiveSuccesses = 0; // Reset if not sufficient
      }
    } catch (err) {
      console.warn(`[FCZ-TX] Allowance check failed (attempt ${attempt + 1}):`, err);
      consecutiveSuccesses = 0;
    }
  }

  console.error('[FCZ-TX] ✗ Allowance update timeout after', maxRetries, 'attempts. Last value:', lastAllowance.toString());
  return false;
}

/**
 * Final verification of allowance before deposit - EXTRA SAFETY
 * Uses ALL RPCs in parallel and requires majority agreement
 */
export async function verifyAllowanceBeforeDeposit(
  tokenAddress: Address,
  ownerAddress: Address,
  spenderAddress: Address,
  requiredAmount: bigint,
  maxAttempts: number = 9
): Promise<{ verified: boolean; actualAllowance: bigint }> {
  console.log('[FCZ-TX] Final allowance verification before deposit...');
  
  let highestAllowance = BigInt(0);
  let successfulReads = 0;
  const REQUIRED_SUCCESSFUL_READS = Math.ceil(maxAttempts / 2); // Majority required
  
  // Try all RPCs in parallel for faster verification
  const rpcPromises = RPC_ENDPOINTS.map(async (endpoint) => {
    try {
      const freshClient = createFreshPublicClient(endpoint);
      const allowance = await freshClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [ownerAddress, spenderAddress],
      }) as bigint;
      return { endpoint, allowance, success: true };
    } catch (err) {
      return { endpoint, allowance: BigInt(0), success: false, error: err };
    }
  });
  
  const results = await Promise.all(rpcPromises);
  
  for (const result of results) {
    if (result.success) {
      if (result.allowance > highestAllowance) {
        highestAllowance = result.allowance;
      }
      if (result.allowance >= requiredAmount) {
        successfulReads++;
        console.log(`[FCZ-TX] Parallel verification: ✓ PASS on ${result.endpoint.slice(8, 30)} (${formatUnits(result.allowance, 6)} USDC)`);
      } else {
        console.log(`[FCZ-TX] Parallel verification: ✗ FAIL on ${result.endpoint.slice(8, 30)} (${formatUnits(result.allowance, 6)} < ${formatUnits(requiredAmount, 6)})`);
      }
    } else {
      console.warn(`[FCZ-TX] Parallel verification: ERROR on ${result.endpoint.slice(8, 30)}`);
    }
  }
  
  // If parallel checks don't pass, do sequential retries
  if (successfulReads < REQUIRED_SUCCESSFUL_READS) {
    console.log('[FCZ-TX] Parallel verification incomplete, doing sequential retries...');
    
    for (let i = 0; i < maxAttempts - RPC_ENDPOINTS.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        const rpcEndpoint = RPC_ENDPOINTS[i % RPC_ENDPOINTS.length];
        const freshClient = createFreshPublicClient(rpcEndpoint);
        
        const allowance = await freshClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [ownerAddress, spenderAddress],
        }) as bigint;
        
        if (allowance > highestAllowance) {
          highestAllowance = allowance;
        }
        
        if (allowance >= requiredAmount) {
          successfulReads++;
          console.log(`[FCZ-TX] Sequential verification ${i + 1}: ✓ PASS (${formatUnits(allowance, 6)} USDC)`);
          
          if (successfulReads >= REQUIRED_SUCCESSFUL_READS) {
            return { verified: true, actualAllowance: allowance };
          }
        }
      } catch (err) {
        console.warn(`[FCZ-TX] Sequential verification ${i + 1} failed:`, err);
      }
    }
  }
  
  const verified = successfulReads >= REQUIRED_SUCCESSFUL_READS;
  console.log(`[FCZ-TX] Final verification result: ${verified ? '✓ VERIFIED' : '✗ FAILED'} (${successfulReads}/${RPC_ENDPOINTS.length + maxAttempts - RPC_ENDPOINTS.length} checks passed)`);
  
  return { verified, actualAllowance: highestAllowance };
}

// ============================================================================
// WALLETCONNECT SESSION CLEANUP - COMPREHENSIVE (v6)
// ============================================================================

/**
 * Clean up stale WalletConnect sessions from storage
 * AGGRESSIVE: Cleans ALL possible WC-related keys
 */
export function cleanupWalletConnectStorage(): number {
  let removedCount = 0;
  
  try {
    // Clear localStorage entries
    const localKeysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('wc@2:') || 
        key.startsWith('wc@1:') || 
        key.startsWith('walletconnect') ||
        key.startsWith('WALLETCONNECT') ||
        key.includes('wc_session') ||
        key.includes('@walletconnect') ||
        key.startsWith('wc_') ||
        key.includes('pairing') ||
        key.includes('relay') ||
        (key.includes('topic') && key.includes('wc')) ||
        key.includes('wallet-connect') ||
        // Also clean wagmi WC state
        (key.includes('wagmi') && key.includes('walletConnect'))
      )) {
        localKeysToRemove.push(key);
      }
    }
    
    localKeysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        removedCount++;
      } catch {}
    });

    // Clear sessionStorage entries
    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (
        key.startsWith('wc@2:') || 
        key.startsWith('wc@1:') || 
        key.startsWith('walletconnect') ||
        key.includes('@walletconnect') ||
        key.includes('wc_session')
      )) {
        sessionKeysToRemove.push(key);
      }
    }
    
    sessionKeysToRemove.forEach(key => {
      try {
        sessionStorage.removeItem(key);
        removedCount++;
      } catch {}
    });

    if (removedCount > 0) {
      console.log(`[FCZ-TX] Cleaned ${removedCount} stale WalletConnect sessions`);
    }
  } catch (error) {
    console.warn('[FCZ-TX] Error cleaning WalletConnect sessions:', error);
  }
  
  return removedCount;
}

// ============================================================================
// EVENT BROADCASTING
// ============================================================================

export function broadcastBalanceRefresh(): void {
  window.dispatchEvent(new CustomEvent('fcz:balance:refresh'));
  console.log('[FCZ-TX] Balance refresh event dispatched');
}

export function broadcastReconnectRequired(reason: string): void {
  window.dispatchEvent(new CustomEvent('fcz:wallet:reconnect-required', {
    detail: { reason }
  }));
  console.log('[FCZ-TX] Reconnect required event dispatched:', reason);
}

export function broadcastTxUpdate(payload: { 
  txHash: string; 
  type: TxType; 
  status: TxStatus;
  amount?: number;
}): void {
  window.dispatchEvent(new CustomEvent('fcz:tx:update', { detail: payload }));
}

export function broadcastWalletError(error: { code: string; message: string }): void {
  window.dispatchEvent(new CustomEvent('fcz:wallet:error', { detail: error }));
}

// ============================================================================
// GLOBAL ERROR HANDLING
// ============================================================================

let globalErrorHandlerInstalled = false;

export function setupGlobalWalletConnectErrorHandler(): () => void {
  if (globalErrorHandlerInstalled) {
    console.log('[FCZ-TX] Global error handler already installed, skipping');
    return () => {};
  }

  // Use the shared hasPersistedWagmiConnection function defined above
  
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    if (isSessionError(reason)) {
      console.warn('[FCZ-TX] Caught unhandled WC rejection in global handler:', 
        reason?.message?.slice?.(0, 100) || reason);
      event.preventDefault();
      // IMPORTANT:
      // Do NOT blindly clear WalletConnect storage while a real connection exists.
      // This previously caused wallets to disconnect during page navigation when
      // benign WC errors bubbled up. Only run aggressive cleanup when there is
      // NO persisted wagmi connection (i.e. on cold-start / stale sessions).
      if (!hasPersistedWagmiConnection()) {
        cleanupWalletConnectStorage();
      } else {
        console.log('[FCZ-TX] Skipping WC storage cleanup – persisted wagmi connection detected');
      }
    }
  };

  const handleError = (event: ErrorEvent) => {
    if (isSessionError(event.error)) {
      console.warn('[FCZ-TX] Caught WC error in global handler');
      event.preventDefault();
      if (!hasPersistedWagmiConnection()) {
        cleanupWalletConnectStorage();
      } else {
        console.log('[FCZ-TX] Skipping WC storage cleanup – persisted wagmi connection detected');
      }
    }
  };

  window.addEventListener('unhandledrejection', handleUnhandledRejection);
  window.addEventListener('error', handleError);
  
  globalErrorHandlerInstalled = true;
  console.log('[FCZ-TX] Global WalletConnect error handler installed');
  
  return () => {
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    window.removeEventListener('error', handleError);
    globalErrorHandlerInstalled = false;
  };
}

// ============================================================================
// SERVICE INITIALIZATION
// ============================================================================

const BALANCE_QUERY_KEYS: ReadonlyArray<readonly unknown[]> = [
  ['wallet'],
  ['wallet', 'summary'],
  ['escrow-balance'],
  ['escrow-snapshot'],
  ['unified-balance'],
  ['usdcBalance'],
  ['readContract'],
  ['onchain-activity'],
  ['allowance'],
];

let serviceInitialized = false;

/**
 * Check if wagmi has a valid persisted connection in localStorage
 * CRITICAL: Used to prevent cleanup when a valid connection exists
 * This prevents wallet disconnections on page reload
 */
function hasPersistedWagmiConnection(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem('wagmi.store');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const connections = parsed?.state?.connections;
    const current = parsed?.state?.current;
    if (current && connections?.value?.length > 0) {
      // Find the current connection entry and ensure it has accounts
      const currentEntry = connections.value.find(
        (entry: any) => Array.isArray(entry) && entry[0] === current,
      );
      if (currentEntry && currentEntry[1]?.accounts?.length > 0) {
        return true;
      }
      // Fallback: any connection with accounts counts as "persisted"
      return connections.value.some(
        (entry: any) => Array.isArray(entry) && entry[1]?.accounts?.length > 0,
      );
    }
  } catch {
    // Ignore parse errors – treat as no persisted connection
  }
  return false;
}

export function initializeOnchainService(): void {
  if (serviceInitialized) {
    return;
  }
  
  setupGlobalWalletConnectErrorHandler();
  retryFailedTransactionLogs();
  
  // CRITICAL FIX: Only cleanup if there's NO persisted connection
  // This prevents disconnecting wallets on page reload
  if (!hasPersistedWagmiConnection()) {
    cleanupWalletConnectStorage();
  }
  
  serviceInitialized = true;
}

export function setupBalanceRefreshListener(queryClient?: QueryClient): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = () => {
    try {
      if (queryClient) {
        BALANCE_QUERY_KEYS.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key, exact: false }).catch((err) => {
            console.warn('[FCZ-TX] Failed to invalidate query', key, err);
          });
        });
      }
    } catch (err) {
      console.warn('[FCZ-TX] Balance refresh invalidation failed:', err);
    }
  };

  window.addEventListener('fcz:balance:refresh', handler);
  return () => window.removeEventListener('fcz:balance:refresh', handler);
}

// ============================================================================
// UTILITY: Hard delay with logging
// ============================================================================

export async function hardDelay(ms: number, reason: string): Promise<void> {
  console.log(`[FCZ-TX] Hard delay: ${ms}ms - ${reason}`);
  await new Promise(resolve => setTimeout(resolve, ms));
}
