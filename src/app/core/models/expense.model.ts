export type ExpenseCategory = 
  | 'fixed' 
  | 'food' 
  | 'daily' 
  | 'savings' 
  | 'bills' 
  | 'entertainment' 
  | 'vehicle' 
  | 'other';

export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  quantity: number;
  unitPrice: number;
  category: ExpenseCategory;
  date: string; // ISO format (YYYY-MM-DD)
  createdBy: string;
  paymentMethod: 'cash' | 'debit' | 'credit' | 'qris' | 'transfer';
  receiptImageUrl?: string;
  notes?: string;
  telegramSyncId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ExpenseSummary {
  totalAmount: number;
  totalItems: number;
  categoryBreakdown: Record<ExpenseCategory, number>;
  monthlyBuffer: number;
}

export interface TelegramExpensePayload {
  rawMessage: string;
  parsedTitle: string;
  parsedAmount: number;
  parsedQuantity?: number;
  parsedCategory?: ExpenseCategory;
  date: string;
  chatId: string;
  confidenceScore: number;
}