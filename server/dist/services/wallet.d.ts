import type { Wallet, WalletTransaction, Deposit, Withdraw, PaginationQuery, PaginatedResponse } from '@fanclubz/shared';
export declare class WalletService {
    private supabase;
    constructor();
    getUserBalances(userId: string): Promise<Wallet[]>;
    getUserBalance(userId: string, currency: string): Promise<Wallet>;
    private createWallet;
    initiateDeposit(userId: string, depositData: Deposit): Promise<WalletTransaction>;
    confirmDeposit(transactionId: string): Promise<WalletTransaction>;
    initiateWithdrawal(userId: string, withdrawalData: Withdraw): Promise<WalletTransaction>;
    confirmWithdrawal(transactionId: string): Promise<WalletTransaction>;
    transferFunds(transferData: {
        fromUserId: string;
        toUserId: string;
        amount: number;
        currency: string;
        note?: string;
    }): Promise<{
        fromTransaction: WalletTransaction;
        toTransaction: WalletTransaction;
    }>;
    getUserTransactions(userId: string, pagination: PaginationQuery, filters?: {
        type?: string;
        currency?: string;
        status?: string;
    }): Promise<PaginatedResponse<WalletTransaction>>;
    getTransaction(transactionId: string, userId: string): Promise<WalletTransaction | null>;
    getUserWalletStats(userId: string): Promise<{
        totalDeposits: number;
        totalWithdrawals: number;
        totalTransfersIn: number;
        totalTransfersOut: number;
        transactionCount: number;
        currencyBreakdown: Record<string, any>;
    }>;
    private updateWalletBalance;
    lockFundsForPrediction(userId: string, amount: number, currency: string, predictionEntryId: string): Promise<WalletTransaction>;
    releaseFundsFromPrediction(userId: string, amount: number, currency: string, predictionEntryId: string, isWin: boolean): Promise<WalletTransaction>;
}
