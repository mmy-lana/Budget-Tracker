export interface CashFlowIncome {
  id: string;
  source: string;
  provider: 'husband' | 'wife' | 'side_income' | 'other';
  amount: number;
  month: string; // YYYY-MM
}

export interface FixedExpenseItem {
  id: string;
  title: string;
  category: string;
  amount: number;
  dueDate?: number; // 1-31
  isPaid: boolean;
}

export interface SavingsTarget {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadlineMonths: number;
  monthlyAllocation: number;
}

export interface MonthlyCashFlowSummary {
  month: string;
  totalIncome: number;
  totalFixedExpenses: number;
  totalVariableExpenses: number;
  totalSavingsTarget: number;
  monthlyBuffer: number;
}