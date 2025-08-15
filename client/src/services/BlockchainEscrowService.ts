import { createPublicClient, createWalletClient, custom, parseEther, formatEther } from 'viem';
import { polygon } from 'viem/chains';

// Smart contract ABI (simplified for escrow functions)
const ESCROW_ABI = [
  {
    inputs: [
      { name: 'predictionId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'lockFunds',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'predictionId', type: 'bytes32' },
      { name: 'winners', type: 'address[]' },
      { name: 'amounts', type: 'uint256[]' }
    ],
    name: 'releaseFunds',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'predictionId', type: 'bytes32' }],
    name: 'getLockedAmount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'predictionId', type: 'bytes32' }],
    name: 'getEscrowStatus',
    outputs: [
      { name: 'isLocked', type: 'bool' },
      { name: 'totalAmount', type: 'uint256' },
      { name: 'participantCount', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// Contract address on Polygon (this would be the deployed contract address)
const ESCROW_CONTRACT_ADDRESS = process.env.VITE_ESCROW_CONTRACT_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000000';

interface EscrowStatus {
  isLocked: boolean;
  totalAmount: bigint;
  participantCount: bigint;
}

interface EscrowTransaction {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  gasUsed?: bigint;
  blockNumber?: bigint;
}

export class BlockchainEscrowService {
  private publicClient;
  private walletClient;

  constructor() {
    // Initialize clients for Polygon
    this.publicClient = createPublicClient({
      chain: polygon,
      transport: custom(window.ethereum || {})
    });

    this.walletClient = createWalletClient({
      chain: polygon,
      transport: custom(window.ethereum || {})
    });
  }

  /**
   * Lock funds in escrow for a prediction
   */
  async lockFunds(predictionId: string, amountInUSD: number): Promise<EscrowTransaction> {
    try {
      if (!window.ethereum) {
        throw new Error('Web3 wallet not available');
      }

      // Convert USD amount to Wei (assuming 1:1 ratio for simplicity)
      // In production, you'd use a price oracle
      const amountInWei = parseEther(amountInUSD.toString());
      
      // Convert prediction ID to bytes32
      const predictionIdBytes32 = `0x${predictionId.replace(/-/g, '').padEnd(64, '0')}` as `0x${string}`;

      // Get user account
      const [account] = await this.walletClient.getAddresses();
      if (!account) {
        throw new Error('No wallet account available');
      }

      // Execute the transaction
      const hash = await this.walletClient.writeContract({
        address: ESCROW_CONTRACT_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'lockFunds',
        args: [predictionIdBytes32, amountInWei],
        value: amountInWei,
        account
      });

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      return {
        hash,
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        gasUsed: receipt.gasUsed,
        blockNumber: receipt.blockNumber
      };

    } catch (error) {
      console.error('Error locking funds:', error);
      throw new Error(`Failed to lock funds: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Release funds to winners
   */
  async releaseFunds(
    predictionId: string, 
    winners: Array<{ address: string; amount: number }>
  ): Promise<EscrowTransaction> {
    try {
      if (!window.ethereum) {
        throw new Error('Web3 wallet not available');
      }

      // Convert prediction ID to bytes32
      const predictionIdBytes32 = `0x${predictionId.replace(/-/g, '').padEnd(64, '0')}` as `0x${string}`;
      
      // Prepare winner addresses and amounts
      const winnerAddresses = winners.map(w => w.address as `0x${string}`);
      const winnerAmounts = winners.map(w => parseEther(w.amount.toString()));

      // Get user account (should be admin/server account)
      const [account] = await this.walletClient.getAddresses();
      if (!account) {
        throw new Error('No admin account available');
      }

      // Execute the transaction
      const hash = await this.walletClient.writeContract({
        address: ESCROW_CONTRACT_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'releaseFunds',
        args: [predictionIdBytes32, winnerAddresses, winnerAmounts],
        account
      });

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      return {
        hash,
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        gasUsed: receipt.gasUsed,
        blockNumber: receipt.blockNumber
      };

    } catch (error) {
      console.error('Error releasing funds:', error);
      throw new Error(`Failed to release funds: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the locked amount for a prediction
   */
  async getLockedAmount(predictionId: string): Promise<number> {
    try {
      const predictionIdBytes32 = `0x${predictionId.replace(/-/g, '').padEnd(64, '0')}` as `0x${string}`;
      
      const result = await this.publicClient.readContract({
        address: ESCROW_CONTRACT_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'getLockedAmount',
        args: [predictionIdBytes32]
      });

      // Convert from Wei to USD (simplified)
      return parseFloat(formatEther(result));

    } catch (error) {
      console.error('Error getting locked amount:', error);
      return 0;
    }
  }

  /**
   * Get escrow status for a prediction
   */
  async getEscrowStatus(predictionId: string): Promise<EscrowStatus | null> {
    try {
      const predictionIdBytes32 = `0x${predictionId.replace(/-/g, '').padEnd(64, '0')}` as `0x${string}`;
      
      const result = await this.publicClient.readContract({
        address: ESCROW_CONTRACT_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'getEscrowStatus',
        args: [predictionIdBytes32]
      });

      return {
        isLocked: result[0],
        totalAmount: result[1],
        participantCount: result[2]
      };

    } catch (error) {
      console.error('Error getting escrow status:', error);
      return null;
    }
  }

  /**
   * Check if the user has a Web3 wallet connected
   */
  async isWalletConnected(): Promise<boolean> {
    try {
      if (!window.ethereum) return false;
      
      const accounts = await this.walletClient.getAddresses();
      return accounts.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Connect to user's Web3 wallet
   */
  async connectWallet(): Promise<string | null> {
    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask or another Web3 wallet');
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      const accounts = await this.walletClient.getAddresses();
      return accounts[0] || null;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw new Error(`Failed to connect wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Switch to Polygon network if not already connected
   */
  async switchToPolygon(): Promise<void> {
    try {
      if (!window.ethereum) {
        throw new Error('Web3 wallet not available');
      }

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x89' }], // Polygon Mainnet
      });
    } catch (switchError: any) {
      // If the chain hasn't been added to the user's wallet
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x89',
                chainName: 'Polygon Mainnet',
                nativeCurrency: {
                  name: 'MATIC',
                  symbol: 'MATIC',
                  decimals: 18,
                },
                rpcUrls: ['https://polygon-rpc.com/'],
                blockExplorerUrls: ['https://polygonscan.com/'],
              },
            ],
          });
        } catch (addError) {
          throw new Error('Failed to add Polygon network to wallet');
        }
      } else {
        throw new Error('Failed to switch to Polygon network');
      }
    }
  }
}

// Export singleton instance
export const escrowService = new BlockchainEscrowService();

// Type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      isMetaMask?: boolean;
    };
  }
}
