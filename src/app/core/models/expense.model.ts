export type FoodSubCategory = 'ingredients' | 'cafe_coffee' | 'online_delivery' | 'resto_dining' | 'snacks';
export type EntertainmentSubCategory = 'movies_theater' | 'events' | 'other';
export type ExpenseSubCategory = FoodSubCategory | EntertainmentSubCategory | 'fixed' | 'vehicle' | 'utility' | 'other';

export type ExpenseCategory = 
  | 'food' 
  | 'entertainment' 
  | 'fixed' 
  | 'vehicle' 
  | 'utility' 
  | 'other';

export interface TransactionLineItem {
  id: string;
  transactionId: string;
  itemTitle: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  subCategory: ExpenseSubCategory;
}

export interface ParentTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  storeName: string;
  totalAmount: number;
  taxPpn: number;
  deliveryFee: number;
  createdBy: string;
  paymentAccountId: string;
  createdAt: number;
  lineItems?: TransactionLineItem[];
}

export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  quantity: number;
  unitPrice: number;
  category: ExpenseCategory;
  subCategory?: ExpenseSubCategory;
  storeName?: string;
  date: string; // ISO format (YYYY-MM-DD)
  createdBy: string;
  paymentMethod: 'cash' | 'debit' | 'credit' | 'qris' | 'transfer';
  paymentAccountId?: string;
  receiptImageUrl?: string;
  notes?: string;
  telegramSyncId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface NalanginLedger {
  id: string;
  type: 'payable' | 'receivable'; // payable = bought using someone else's money; receivable = bought for someone else
  person: string;
  amount: number;
  date?: string; // YYYY-MM-DD
  notes: string;
  status: 'pending' | 'settled';
  transactionId?: string;
  createdAt: number;
  settledAt?: number;
}

export interface AccountTransfer {
  id: string;
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amount: number;
  notes: string;
  createdAt: number;
}

export interface DatabaseBackup {
  version: string;
  exportedAt: string;
  expenses: ExpenseItem[];
  accounts: PaymentAccount[];
  nalanginLedger: NalanginLedger[];
  savingsTargets: any[];
  transfers: AccountTransfer[];
}

export interface PaymentAccount {
  id: string;
  name: string; // 'Bank Jago (Joint)', 'BCA', 'Mandiri', 'GoPay', 'Cash'
  type: 'bank' | 'e-wallet' | 'cash';
  balance: number;
  updatedAt: number;
}

export interface BalanceAdjustmentLog {
  id: string;
  accountId: string;
  accountName: string;
  previousBalance: number;
  newBalance: number;
  difference: number;
  reason: string;
  createdAt: number;
}

export interface CategoryBudgetSetting {
  id: string;
  key: string; // 'food', 'fixed', 'utility', 'entertainment', 'vehicle'
  label: string;
  limitAmount: number;
  period: 'monthly' | 'weekly';
}

export interface TimeframeTotals {
  todaySpent: number;
  thisWeekSpent: number;
  thisMonthSpent: number;
  thisYearSpent: number;
}

export interface BudgetCapWarning {
  type: 'food_subcategory' | 'overall_cycle' | 'category_cap';
  title: string;
  percentage: number;
  message: string;
}

export interface ExpenseSummary {
  totalAmount: number;
  totalItems: number;
  categoryBreakdown: Record<ExpenseCategory, number>;
  monthlyBuffer: number;
  timeframeTotals: TimeframeTotals;
  warnings: BudgetCapWarning[];
}

export interface TelegramExpensePayload {
  pendingId: string;
  rawMessage: string;
  parsedTitle: string;
  parsedAmount: number;
  parsedQuantity: number;
  parsedUnitPrice: number;
  parsedCategory: ExpenseCategory;
  parsedSubCategory: ExpenseSubCategory;
  date: string;
  chatId: string;
  confidenceScore: number;
  confirmed?: boolean;
}