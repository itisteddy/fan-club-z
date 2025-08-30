"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("../config");
const logger_1 = __importDefault(require("../utils/logger"));
class WalletService {
    constructor() {
        this.supabase = (0, supabase_js_1.createClient)(config_1.config.supabase.url, config_1.config.supabase.serviceRoleKey);
    }
    async getUserBalances(userId) {
        try {
            const { data, error } = await this.supabase
                .from('wallets')
                .select('*')
                .eq('user_id', userId);
            if (error) {
                logger_1.default.error('Error fetching user balances:', error);
                throw new Error('Failed to fetch wallet balances');
            }
            const currencies = ['NGN', 'USD', 'USDT', 'ETH'];
            const existingCurrencies = data?.map(w => w.currency) || [];
            for (const currency of currencies) {
                if (!existingCurrencies.includes(currency)) {
                    await this.createWallet(userId, currency);
                }
            }
            const { data: updatedData, error: updatedError } = await this.supabase
                .from('wallets')
                .select('*')
                .eq('user_id', userId)
                .order('currency');
            if (updatedError) {
                throw new Error('Failed to fetch updated wallet balances');
            }
            return updatedData || [];
        }
        catch (error) {
            logger_1.default.error('Error in getUserBalances:', error);
            throw error;
        }
    }
    async getUserBalance(userId, currency) {
        try {
            const { data, error } = await this.supabase
                .from('wallets')
                .select('*')
                .eq('user_id', userId)
                .eq('currency', currency)
                .single();
            if (error && error.code === 'PGRST116') {
                return await this.createWallet(userId, currency);
            }
            if (error) {
                logger_1.default.error('Error fetching user balance:', error);
                throw new Error('Failed to fetch wallet balance');
            }
            return data;
        }
        catch (error) {
            logger_1.default.error('Error in getUserBalance:', error);
            throw error;
        }
    }
    async createWallet(userId, currency) {
        try {
            const { data, error } = await this.supabase
                .from('wallets')
                .insert({
                user_id: userId,
                currency,
                available_balance: 0,
                reserved_balance: 0,
                total_deposited: 0,
                total_withdrawn: 0,
            })
                .select()
                .single();
            if (error) {
                logger_1.default.error('Error creating wallet:', error);
                throw new Error('Failed to create wallet');
            }
            return data;
        }
        catch (error) {
            logger_1.default.error('Error in createWallet:', error);
            throw error;
        }
    }
    async initiateDeposit(userId, depositData) {
        try {
            const { amount, currency, payment_method } = depositData;
            const reference = `DEP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const { data, error } = await this.supabase
                .from('wallet_transactions')
                .insert({
                user_id: userId,
                type: 'deposit',
                currency,
                amount,
                status: 'pending',
                reference,
                description: `Deposit via ${payment_method}`,
            })
                .select()
                .single();
            if (error) {
                logger_1.default.error('Error creating deposit transaction:', error);
                throw new Error('Failed to initiate deposit');
            }
            if (config_1.config.payment.demoMode) {
                setTimeout(async () => {
                    try {
                        await this.confirmDeposit(data.id);
                    }
                    catch (error) {
                        logger_1.default.error('Error auto-confirming demo deposit:', error);
                    }
                }, config_1.config.payment.demoProcessingDelay);
            }
            return data;
        }
        catch (error) {
            logger_1.default.error('Error in initiateDeposit:', error);
            throw error;
        }
    }
    async confirmDeposit(transactionId) {
        try {
            const { data: transaction, error: fetchError } = await this.supabase
                .from('wallet_transactions')
                .select('*')
                .eq('id', transactionId)
                .eq('type', 'deposit')
                .eq('status', 'pending')
                .single();
            if (fetchError || !transaction) {
                throw new Error('Transaction not found or already processed');
            }
            const { data: updatedTransaction, error: updateError } = await this.supabase
                .from('wallet_transactions')
                .update({
                status: 'completed',
                updated_at: new Date().toISOString(),
            })
                .eq('id', transactionId)
                .select()
                .single();
            if (updateError) {
                throw new Error('Failed to update transaction status');
            }
            await this.updateWalletBalance(transaction.user_id, transaction.currency, transaction.amount, 'deposit');
            logger_1.default.info(`Deposit confirmed: ${transactionId} for user ${transaction.user_id}`);
            return updatedTransaction;
        }
        catch (error) {
            logger_1.default.error('Error in confirmDeposit:', error);
            throw error;
        }
    }
    async initiateWithdrawal(userId, withdrawalData) {
        try {
            const { amount, currency, destination, withdrawal_method } = withdrawalData;
            const wallet = await this.getUserBalance(userId, currency);
            if (wallet.available_balance < amount) {
                throw new Error('Insufficient balance');
            }
            const reference = `WTH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const { data, error } = await this.supabase
                .from('wallet_transactions')
                .insert({
                user_id: userId,
                type: 'withdraw',
                currency,
                amount: -amount,
                status: 'pending',
                reference,
                description: `Withdrawal via ${withdrawal_method} to ${destination.substring(0, 10)}...`,
            })
                .select()
                .single();
            if (error) {
                logger_1.default.error('Error creating withdrawal transaction:', error);
                throw new Error('Failed to initiate withdrawal');
            }
            await this.updateWalletBalance(userId, currency, -amount, 'reserve');
            if (config_1.config.payment.demoMode) {
                setTimeout(async () => {
                    try {
                        await this.confirmWithdrawal(data.id);
                    }
                    catch (error) {
                        logger_1.default.error('Error auto-confirming demo withdrawal:', error);
                    }
                }, config_1.config.payment.demoProcessingDelay * 3);
            }
            return data;
        }
        catch (error) {
            logger_1.default.error('Error in initiateWithdrawal:', error);
            throw error;
        }
    }
    async confirmWithdrawal(transactionId) {
        try {
            const { data: transaction, error: fetchError } = await this.supabase
                .from('wallet_transactions')
                .select('*')
                .eq('id', transactionId)
                .eq('type', 'withdraw')
                .eq('status', 'pending')
                .single();
            if (fetchError || !transaction) {
                throw new Error('Transaction not found or already processed');
            }
            const { data: updatedTransaction, error: updateError } = await this.supabase
                .from('wallet_transactions')
                .update({
                status: 'completed',
                updated_at: new Date().toISOString(),
            })
                .eq('id', transactionId)
                .select()
                .single();
            if (updateError) {
                throw new Error('Failed to update transaction status');
            }
            await this.updateWalletBalance(transaction.user_id, transaction.currency, Math.abs(transaction.amount), 'withdraw_confirm');
            logger_1.default.info(`Withdrawal confirmed: ${transactionId} for user ${transaction.user_id}`);
            return updatedTransaction;
        }
        catch (error) {
            logger_1.default.error('Error in confirmWithdrawal:', error);
            throw error;
        }
    }
    async transferFunds(transferData) {
        try {
            const { fromUserId, toUserId, amount, currency, note } = transferData;
            const { data: recipient, error: recipientError } = await this.supabase
                .from('users')
                .select('id, username, email')
                .eq('id', toUserId)
                .single();
            if (recipientError || !recipient) {
                throw new Error('Recipient not found');
            }
            const senderWallet = await this.getUserBalance(fromUserId, currency);
            if (senderWallet.available_balance < amount) {
                throw new Error('Insufficient balance');
            }
            const reference = `TRF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const transactions = await Promise.all([
                this.supabase
                    .from('wallet_transactions')
                    .insert({
                    user_id: fromUserId,
                    type: 'transfer_out',
                    currency,
                    amount: -amount,
                    status: 'completed',
                    reference,
                    description: note || `Transfer to ${recipient.username || recipient.email}`,
                })
                    .select()
                    .single(),
                this.supabase
                    .from('wallet_transactions')
                    .insert({
                    user_id: toUserId,
                    type: 'transfer_in',
                    currency,
                    amount,
                    status: 'completed',
                    reference,
                    description: note || `Transfer from user`,
                })
                    .select()
                    .single(),
            ]);
            const [fromResult, toResult] = transactions;
            if (fromResult.error || toResult.error) {
                logger_1.default.error('Error creating transfer transactions:', {
                    fromError: fromResult.error,
                    toError: toResult.error
                });
                throw new Error('Failed to create transfer transactions');
            }
            await Promise.all([
                this.updateWalletBalance(fromUserId, currency, -amount, 'transfer'),
                this.updateWalletBalance(toUserId, currency, amount, 'transfer'),
            ]);
            logger_1.default.info(`Transfer completed: ${amount} ${currency} from ${fromUserId} to ${toUserId}`);
            return {
                fromTransaction: fromResult.data,
                toTransaction: toResult.data,
            };
        }
        catch (error) {
            logger_1.default.error('Error in transferFunds:', error);
            throw error;
        }
    }
    async getUserTransactions(userId, pagination, filters = {}) {
        try {
            const { page, limit } = pagination;
            const offset = (page - 1) * limit;
            let query = this.supabase
                .from('wallet_transactions')
                .select('*', { count: 'exact' })
                .eq('user_id', userId);
            if (filters.type) {
                query = query.eq('type', filters.type);
            }
            if (filters.currency) {
                query = query.eq('currency', filters.currency);
            }
            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            query = query
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            const { data, error, count } = await query;
            if (error) {
                logger_1.default.error('Error fetching user transactions:', error);
                throw new Error('Failed to fetch transactions');
            }
            const total = count || 0;
            const totalPages = Math.ceil(total / limit);
            return {
                success: true,
                data: data || [],
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                },
            };
        }
        catch (error) {
            logger_1.default.error('Error in getUserTransactions:', error);
            throw error;
        }
    }
    async getTransaction(transactionId, userId) {
        try {
            const { data, error } = await this.supabase
                .from('wallet_transactions')
                .select('*')
                .eq('id', transactionId)
                .eq('user_id', userId)
                .single();
            if (error && error.code === 'PGRST116') {
                return null;
            }
            if (error) {
                logger_1.default.error('Error fetching transaction:', error);
                throw new Error('Failed to fetch transaction');
            }
            return data;
        }
        catch (error) {
            logger_1.default.error('Error in getTransaction:', error);
            throw error;
        }
    }
    async getUserWalletStats(userId) {
        try {
            const { data: transactions, error } = await this.supabase
                .from('wallet_transactions')
                .select('type, currency, amount, status, created_at')
                .eq('user_id', userId)
                .eq('status', 'completed');
            if (error) {
                logger_1.default.error('Error fetching wallet stats:', error);
                throw new Error('Failed to fetch wallet statistics');
            }
            const stats = {
                totalDeposits: 0,
                totalWithdrawals: 0,
                totalTransfersIn: 0,
                totalTransfersOut: 0,
                transactionCount: transactions?.length || 0,
                currencyBreakdown: {},
            };
            transactions?.forEach(transaction => {
                const { type, currency, amount } = transaction;
                if (!stats.currencyBreakdown[currency]) {
                    stats.currencyBreakdown[currency] = {
                        deposits: 0,
                        withdrawals: 0,
                        transfersIn: 0,
                        transfersOut: 0,
                        netFlow: 0,
                    };
                }
                const currencyStats = stats.currencyBreakdown[currency];
                switch (type) {
                    case 'deposit':
                        stats.totalDeposits += amount;
                        currencyStats.deposits += amount;
                        currencyStats.netFlow += amount;
                        break;
                    case 'withdraw':
                        stats.totalWithdrawals += Math.abs(amount);
                        currencyStats.withdrawals += Math.abs(amount);
                        currencyStats.netFlow += amount;
                        break;
                    case 'transfer_in':
                        stats.totalTransfersIn += amount;
                        currencyStats.transfersIn += amount;
                        currencyStats.netFlow += amount;
                        break;
                    case 'transfer_out':
                        stats.totalTransfersOut += Math.abs(amount);
                        currencyStats.transfersOut += Math.abs(amount);
                        currencyStats.netFlow += amount;
                        break;
                }
            });
            return stats;
        }
        catch (error) {
            logger_1.default.error('Error in getUserWalletStats:', error);
            throw error;
        }
    }
    async updateWalletBalance(userId, currency, amount, operation) {
        try {
            const wallet = await this.getUserBalance(userId, currency);
            let updates = {};
            switch (operation) {
                case 'deposit':
                case 'transfer':
                    updates = {
                        available_balance: wallet.available_balance + amount,
                    };
                    if (operation === 'deposit' && amount > 0) {
                        updates.total_deposited = wallet.total_deposited + amount;
                    }
                    break;
                case 'reserve':
                    updates = {
                        available_balance: wallet.available_balance + amount,
                        reserved_balance: wallet.reserved_balance + Math.abs(amount),
                    };
                    break;
                case 'withdraw_confirm':
                    updates = {
                        reserved_balance: wallet.reserved_balance - amount,
                        total_withdrawn: wallet.total_withdrawn + amount,
                    };
                    break;
            }
            updates.updated_at = new Date().toISOString();
            const { error } = await this.supabase
                .from('wallets')
                .update(updates)
                .eq('user_id', userId)
                .eq('currency', currency);
            if (error) {
                logger_1.default.error('Error updating wallet balance:', error);
                throw new Error('Failed to update wallet balance');
            }
        }
        catch (error) {
            logger_1.default.error('Error in updateWalletBalance:', error);
            throw error;
        }
    }
    async lockFundsForPrediction(userId, amount, currency, predictionEntryId) {
        try {
            const wallet = await this.getUserBalance(userId, currency);
            if (wallet.available_balance < amount) {
                throw new Error('Insufficient balance');
            }
            const { data, error } = await this.supabase
                .from('wallet_transactions')
                .insert({
                user_id: userId,
                type: 'prediction_lock',
                currency,
                amount: -amount,
                status: 'completed',
                related_prediction_entry_id: predictionEntryId,
                description: 'Funds locked for prediction',
            })
                .select()
                .single();
            if (error) {
                throw new Error('Failed to create lock transaction');
            }
            await this.updateWalletBalance(userId, currency, -amount, 'reserve');
            return data;
        }
        catch (error) {
            logger_1.default.error('Error in lockFundsForPrediction:', error);
            throw error;
        }
    }
    async releaseFundsFromPrediction(userId, amount, currency, predictionEntryId, isWin) {
        try {
            const transactionType = isWin ? 'prediction_release' : 'prediction_release';
            const description = isWin ? 'Prediction payout' : 'Prediction refund';
            const { data, error } = await this.supabase
                .from('wallet_transactions')
                .insert({
                user_id: userId,
                type: transactionType,
                currency,
                amount,
                status: 'completed',
                related_prediction_entry_id: predictionEntryId,
                description,
            })
                .select()
                .single();
            if (error) {
                throw new Error('Failed to create release transaction');
            }
            const wallet = await this.getUserBalance(userId, currency);
            const updates = {
                available_balance: wallet.available_balance + amount,
                reserved_balance: Math.max(0, wallet.reserved_balance - amount),
                updated_at: new Date().toISOString(),
            };
            const { error: updateError } = await this.supabase
                .from('wallets')
                .update(updates)
                .eq('user_id', userId)
                .eq('currency', currency);
            if (updateError) {
                throw new Error('Failed to update wallet after release');
            }
            return data;
        }
        catch (error) {
            logger_1.default.error('Error in releaseFundsFromPrediction:', error);
            throw error;
        }
    }
}
exports.WalletService = WalletService;
//# sourceMappingURL=wallet.js.map