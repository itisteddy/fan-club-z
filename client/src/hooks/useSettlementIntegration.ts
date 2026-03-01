import { useState, useCallback } from 'react';
import { escrowService } from '../services/BlockchainEscrowService';
import { getApiUrl } from '@/utils/environment';

interface UseSettlementIntegrationReturn {
  // Blockchain operations
  lockFundsOnChain: (predictionId: string, amount: number) => Promise<void>;
  releaseFundsOnChain: (predictionId: string, winners: Array<{ address: string; amount: number }>) => Promise<void>;
  getEscrowStatus: (predictionId: string) => Promise<any>;
  
  // Settlement operations
  settlePrediction: (predictionId: string, winningOptionId: string, proofUrl?: string, reason?: string) => Promise<void>;
  createDispute: (predictionId: string, reason: string, evidenceUrl?: string) => Promise<void>;
  resolveDispute: (disputeId: string, resolution: 'approved' | 'rejected', resolutionReason: string, newWinningOptionId?: string) => Promise<void>;
  
  // State
  isProcessing: boolean;
  error: string | null;
  
  // Blockchain state
  isWalletConnected: boolean;
  walletAddress: string | null;
  connectWallet: () => Promise<void>;
}

export const useSettlementIntegration = (): UseSettlementIntegrationReturn => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const apiBase = getApiUrl();

  const clearError = useCallback(() => setError(null), []);

  // Blockchain operations
  const lockFundsOnChain = useCallback(async (predictionId: string, amount: number) => {
    try {
      setIsProcessing(true);
      clearError();
      
      const result = await escrowService.lockFunds(predictionId, amount);
      
      if (result.status === 'failed') {
        throw new Error('Blockchain transaction failed');
      }
      
      // Log the transaction to the database
      const token = localStorage.getItem('token');
      await fetch(`${apiBase}/api/v2/settlement/blockchain-transaction`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          predictionId,
          type: 'escrow_lock',
          transactionHash: result.hash,
          gasUsed: result.gasUsed?.toString(),
          blockNumber: result.blockNumber?.toString(),
          status: result.status
        })
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to lock funds';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [clearError]);

  const releaseFundsOnChain = useCallback(async (
    predictionId: string, 
    winners: Array<{ address: string; amount: number }>
  ) => {
    try {
      setIsProcessing(true);
      clearError();
      
      const result = await escrowService.releaseFunds(predictionId, winners);
      
      if (result.status === 'failed') {
        throw new Error('Blockchain transaction failed');
      }
      
      // Log the transaction to the database
      const token = localStorage.getItem('token');
      await fetch(`${apiBase}/api/v2/settlement/blockchain-transaction`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          predictionId,
          type: 'escrow_release',
          transactionHash: result.hash,
          gasUsed: result.gasUsed?.toString(),
          blockNumber: result.blockNumber?.toString(),
          status: result.status,
          payload: { winners }
        })
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to release funds';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [clearError]);

  const getEscrowStatus = useCallback(async (predictionId: string) => {
    try {
      return await escrowService.getEscrowStatus(predictionId);
    } catch (err) {
      console.error('Error getting escrow status:', err);
      return null;
    }
  }, []);

  // Settlement operations
  const settlePrediction = useCallback(async (
    predictionId: string, 
    winningOptionId: string, 
    proofUrl?: string, 
    reason?: string
  ) => {
    try {
      setIsProcessing(true);
      clearError();
      
      const token = localStorage.getItem('token');
      
      // First, settle on the backend
      const response = await fetch(`${apiBase}/api/v2/settlement/settle-manual`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          predictionId,
          winningOptionId,
          proofUrl,
          reason
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Settlement failed');
      }

      const result = await response.json();
      
      // TODO: In production, this would trigger blockchain release automatically
      // For now, we'll simulate the blockchain interaction
      console.log('Settlement completed:', result);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to settle prediction';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [clearError]);

  const createDispute = useCallback(async (
    predictionId: string, 
    reason: string, 
    evidenceUrl?: string
  ) => {
    try {
      setIsProcessing(true);
      clearError();
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiBase}/api/v2/settlement/dispute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          predictionId,
          reason,
          evidenceUrl
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create dispute');
      }

      const result = await response.json();
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create dispute';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [clearError]);

  const resolveDispute = useCallback(async (
    disputeId: string,
    resolution: 'approved' | 'rejected',
    resolutionReason: string,
    newWinningOptionId?: string
  ) => {
    try {
      setIsProcessing(true);
      clearError();
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiBase}/api/v2/settlement/resolve-dispute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          disputeId,
          resolution,
          resolutionReason,
          newWinningOptionId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to resolve dispute');
      }

      const result = await response.json();
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resolve dispute';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [clearError]);

  // Wallet operations
  const connectWallet = useCallback(async () => {
    try {
      setIsProcessing(true);
      clearError();
      
      const address = await escrowService.connectWallet();
      if (address) {
        setWalletAddress(address);
        setIsWalletConnected(true);
        
        // Switch to Polygon if needed
        await escrowService.switchToPolygon();
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [clearError]);

  // Check wallet connection on load
  useState(() => {
    const checkWalletConnection = async () => {
      try {
        const connected = await escrowService.isWalletConnected();
        setIsWalletConnected(connected);
        
        if (connected && window.ethereum) {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    };
    
    checkWalletConnection();
  });

  return {
    // Blockchain operations
    lockFundsOnChain,
    releaseFundsOnChain,
    getEscrowStatus,
    
    // Settlement operations
    settlePrediction,
    createDispute,
    resolveDispute,
    
    // State
    isProcessing,
    error,
    
    // Blockchain state
    isWalletConnected,
    walletAddress,
    connectWallet
  };
};
