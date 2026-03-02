import { getAddress } from 'viem';
import type { Address } from 'viem';

import { makePublicClient } from '../chain/base/client';
import { resolveAndValidateAddresses } from '../chain/base/addressRegistry';

const ESCROW_ABI = [
  {
    type: 'function',
    name: 'balances',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'reserved',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'totalDeposited',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'totalWithdrawn',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

const USDC_DECIMALS = Number(process.env.USDC_DECIMALS || '6');
const USDC_FACTOR = 10 ** USDC_DECIMALS;

let cachedEscrowAddress: Address | null = null;

export async function getEscrowAddress(): Promise<Address> {
  if (cachedEscrowAddress) {
    return cachedEscrowAddress;
  }

  // Canonical source of truth in production: explicit env vars.
  // This prevents accidental DB registry edits from silently redirecting funds.
  const explicit = process.env.ESCROW_CONTRACT_ADDRESS || process.env.BASE_ESCROW_ADDRESS;
  if (explicit) {
    cachedEscrowAddress = getAddress(explicit) as Address;
    return cachedEscrowAddress;
  }

  const resolved = await resolveAndValidateAddresses();
  if (!resolved.escrow) {
    throw new Error('[FCZ-PAY] Escrow address not configured in chain_addresses');
  }

  cachedEscrowAddress = getAddress(resolved.escrow) as Address;
  return cachedEscrowAddress;
}

function toUSD(value: bigint): number {
  if (value === 0n) return 0;
  return Number(value) / USDC_FACTOR;
}

export type EscrowSnapshot = {
  address: Address;
  availableUSDC: number;
  reservedUSDC: number;
  totalDepositedUSDC: number;
  totalWithdrawnUSDC: number;
};

export async function fetchEscrowSnapshotFor(userAddress: string): Promise<EscrowSnapshot> {
  const address = getAddress(userAddress) as Address;
  const escrowAddress = await getEscrowAddress();
  const client = makePublicClient();

  const [available, reserved, totalDeposited, totalWithdrawn] = await Promise.all([
    client.readContract({
      address: escrowAddress,
      abi: ESCROW_ABI,
      functionName: 'balances',
      args: [address],
    }) as Promise<bigint>,
    client.readContract({
      address: escrowAddress,
      abi: ESCROW_ABI,
      functionName: 'reserved',
      args: [address],
    }) as Promise<bigint>,
    client.readContract({
      address: escrowAddress,
      abi: ESCROW_ABI,
      functionName: 'totalDeposited',
      args: [address],
    }) as Promise<bigint>,
    client.readContract({
      address: escrowAddress,
      abi: ESCROW_ABI,
      functionName: 'totalWithdrawn',
      args: [address],
    }) as Promise<bigint>,
  ]);

  return {
    address,
    availableUSDC: toUSD(available),
    reservedUSDC: toUSD(reserved),
    totalDepositedUSDC: toUSD(totalDeposited),
    totalWithdrawnUSDC: toUSD(totalWithdrawn),
  };
}

