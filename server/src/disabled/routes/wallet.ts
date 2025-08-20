import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { DepositSchema, WithdrawSchema, PaginationQuerySchema } from '@fanclubz/shared';
import { WalletService } from '../services/wallet';
import logger from '../utils/logger';
import type { AuthenticatedRequest } from '../types/auth';
import type { ApiResponse, PaginatedResponse, WalletTransaction, Wallet } from '@fanclubz/shared';

const router = Router();
const walletService = new WalletService();

// ============================================================================
// WALLET BALANCE ENDPOINTS
// ============================================================================

/**
 * GET /api/v2/wallet/balance
 * Get user's wallet balances for all currencies
 */
router.get('/balance', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const balances = await walletService.getUserBalances(userId);
    
    const response: ApiResponse<Wallet[]> = {
      success: true,
      message: 'Wallet balances retrieved successfully',
      data: balances,
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error fetching wallet balances:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch wallet balances',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/v2/wallet/balance/:currency
 * Get user's wallet balance for specific currency
 */
router.get('/balance/:currency', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { currency } = req.params;
    
    // Validate currency
    const validCurrencies = ['NGN', 'USD', 'USDT', 'ETH'];
    if (!validCurrencies.includes(currency.toUpperCase())) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid currency',
      };
      return res.status(400).json(response);
    }
    
    const balance = await walletService.getUserBalance(userId, currency.toUpperCase() as any);
    
    const response: ApiResponse<Wallet> = {
      success: true,
      message: `${currency} balance retrieved successfully`,
      data: balance,
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error fetching wallet balance:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch wallet balance',
    };
    res.status(500).json(response);
  }
});

// ============================================================================
// DEPOSIT ENDPOINTS
// ============================================================================

/**
 * POST /api/v2/wallet/deposit
 * Initiate a deposit (demo implementation)
 */
router.post('/deposit', authenticateToken, validateRequest(DepositSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const depositData = req.body;
    
    const transaction = await walletService.initiateDeposit(userId, depositData);
    
    const response: ApiResponse<WalletTransaction> = {
      success: true,
      message: 'Deposit initiated successfully',
      data: transaction,
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error initiating deposit:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initiate deposit',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/v2/wallet/deposit/confirm
 * Confirm a deposit (demo implementation - in production would be webhook)
 */
router.post('/deposit/confirm', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { transactionId } = req.body;
    
    if (!transactionId) {
      const response: ApiResponse = {
        success: false,
        error: 'Transaction ID is required',
      };
      return res.status(400).json(response);
    }
    
    const transaction = await walletService.confirmDeposit(transactionId);
    
    const response: ApiResponse<WalletTransaction> = {
      success: true,
      message: 'Deposit confirmed successfully',
      data: transaction,
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error confirming deposit:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to confirm deposit',
    };
    res.status(500).json(response);
  }
});

// ============================================================================
// WITHDRAWAL ENDPOINTS
// ============================================================================

/**
 * POST /api/v2/wallet/withdraw
 * Initiate a withdrawal (demo implementation)
 */
router.post('/withdraw', authenticateToken, validateRequest(WithdrawSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const withdrawalData = req.body;
    
    const transaction = await walletService.initiateWithdrawal(userId, withdrawalData);
    
    const response: ApiResponse<WalletTransaction> = {
      success: true,
      message: 'Withdrawal initiated successfully',
      data: transaction,
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error initiating withdrawal:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initiate withdrawal',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/v2/wallet/withdraw/confirm
 * Confirm a withdrawal (demo implementation - admin only)
 */
router.post('/withdraw/confirm', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { transactionId } = req.body;
    
    if (!transactionId) {
      const response: ApiResponse = {
        success: false,
        error: 'Transaction ID is required',
      };
      return res.status(400).json(response);
    }
    
    const transaction = await walletService.confirmWithdrawal(transactionId);
    
    const response: ApiResponse<WalletTransaction> = {
      success: true,
      message: 'Withdrawal confirmed successfully',
      data: transaction,
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error confirming withdrawal:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to confirm withdrawal',
    };
    res.status(500).json(response);
  }
});

// ============================================================================
// TRANSACTION HISTORY ENDPOINTS
// ============================================================================

/**
 * GET /api/v2/wallet/transactions
 * Get user's transaction history with pagination
 */
router.get('/transactions', authenticateToken, validateRequest(PaginationQuerySchema, 'query'), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { page, limit } = req.query as any;
    const { type, currency, status } = req.query as any;
    
    const filters = {
      type: type || undefined,
      currency: currency || undefined,
      status: status || undefined,
    };
    
    const result = await walletService.getUserTransactions(userId, { page, limit }, filters);
    
    const response: PaginatedResponse<WalletTransaction> = {
      success: true,
      data: result.transactions,
      pagination: result.pagination,
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error fetching transaction history:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch transaction history',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/v2/wallet/transactions/:id
 * Get specific transaction details
 */
router.get('/transactions/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    
    const transaction = await walletService.getTransaction(id, userId);
    
    if (!transaction) {
      const response: ApiResponse = {
        success: false,
        error: 'Transaction not found',
      };
      return res.status(404).json(response);
    }
    
    const response: ApiResponse<WalletTransaction> = {
      success: true,
      message: 'Transaction details retrieved successfully',
      data: transaction,
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error fetching transaction details:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch transaction details',
    };
    res.status(500).json(response);
  }
});

// ============================================================================
// TRANSFER ENDPOINTS (P2P)
// ============================================================================

/**
 * POST /api/v2/wallet/transfer
 * Transfer funds to another user (demo implementation)
 */
router.post('/transfer', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const fromUserId = req.user!.id;
    const { toUserId, amount, currency = 'NGN', note } = req.body;
    
    // Validation
    if (!toUserId || !amount) {
      const response: ApiResponse = {
        success: false,
        error: 'Recipient user ID and amount are required',
      };
      return res.status(400).json(response);
    }
    
    if (amount <= 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Amount must be greater than 0',
      };
      return res.status(400).json(response);
    }
    
    if (fromUserId === toUserId) {
      const response: ApiResponse = {
        success: false,
        error: 'Cannot transfer to yourself',
      };
      return res.status(400).json(response);
    }
    
    const result = await walletService.transferFunds({
      fromUserId,
      toUserId,
      amount,
      currency,
      note,
    });
    
    const response: ApiResponse<{ fromTransaction: WalletTransaction; toTransaction: WalletTransaction }> = {
      success: true,
      message: 'Transfer completed successfully',
      data: result,
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error processing transfer:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process transfer',
    };
    res.status(500).json(response);
  }
});

// ============================================================================
// WALLET STATISTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/v2/wallet/stats
 * Get user's wallet statistics
 */
router.get('/stats', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const stats = await walletService.getUserWalletStats(userId);
    
    const response: ApiResponse = {
      success: true,
      message: 'Wallet statistics retrieved successfully',
      data: stats,
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error fetching wallet stats:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch wallet statistics',
    };
    res.status(500).json(response);
  }
});

export default router;
