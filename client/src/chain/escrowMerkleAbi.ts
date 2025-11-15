// Minimal ABI for Merkle-based settlement
export const ESCROW_MERKLE_ABI = [
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
  {
    type: 'function',
    name: 'claim',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'predictionId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
      { name: 'proof', type: 'bytes32[]' },
    ],
    outputs: [],
  },
] as const;


