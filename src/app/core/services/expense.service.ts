import { Injectable, signal, inject } from '@angular/core';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { 
  ExpenseItem, 
  ExpenseSummary, 
  ExpenseCategory, 
  PaymentAccount, 
  NalanginLedger, 
  BalanceAdjustmentLog,
  BudgetCapWarning, 
  CategoryBudgetSetting,
  TimeframeTotals
} from '../models/expense.model';

import { SavingsTarget } from '../models/cashflow.model';
import { AccountTransfer, DatabaseBackup } from '../models/expense.model';

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
    readonly categoryBudgets = signal<CategoryBudgetSetting[]>([
    { id: 'b_food', key: 'food', label: '🥗 Food & Groceries', limitAmount: 2500000, period: 'monthly' },
    { id: 'b_electricity', key: 'fixed', label: '⚡ Electricity & Fixed', limitAmount: 1500000, period: 'monthly' },
    { id: 'b_utility', key: 'utility', label: '💧 Water & Utilities', limitAmount: 500000, period: 'monthly' },
    { id: 'b_entertainment', key: 'entertainment', label: '🎬 Entertainment', limitAmount: 800000, period: 'monthly' },
    { id: 'b_vehicle', key: 'vehicle', label: '🚗 Vehicle & Fuel', limitAmount: 600000, period: 'monthly' }
  ]);
  private firebaseService = inject(FirebaseService);

  readonly expenses = signal<ExpenseItem[]>([]);
  readonly accounts = signal<PaymentAccount[]>([
    { id: 'acc_jago', name: 'Bank Jago (Joint)', type: 'bank', balance: 12500000, updatedAt: Date.now() },
    { id: 'acc_bca', name: 'BCA', type: 'bank', balance: 8400000, updatedAt: Date.now() },
    { id: 'acc_emergency', name: 'Dana Darurat / Emergency Funds', type: 'bank', balance: 3500000, updatedAt: Date.now() },
    { id: 'acc_gopay', name: 'GoPay', type: 'e-wallet', balance: 450000, updatedAt: Date.now() },
    { id: 'acc_cash', name: 'Cash', type: 'cash', balance: 750000, updatedAt: Date.now() }
  ]);
  readonly nalanginList = signal<NalanginLedger[]>([]);
  readonly savingsTargets = signal<SavingsTarget[]>([
    { id: 'sav_1', title: 'Dana Darurat Target', targetAmount: 30642900, currentAmount: 19917885, deadlineMonths: 6, monthlyAllocation: 5107150 },
    { id: 'sav_2', title: 'Sewa Apartemen Target', targetAmount: 20400000, currentAmount: 16320000, deadlineMonths: 12, monthlyAllocation: 1700000 }
  ]);
  readonly balanceLogs = signal<BalanceAdjustmentLog[]>([]);
  readonly transfers = signal<AccountTransfer[]>([]);
  readonly loading = signal<boolean>(true);

  constructor() {
    this.listenToExpenses();
    this.listenToNalangin();
    this.listenToSavingsTargets();
  }

  private listenToNalangin(): void {
    try {
      const q = query(
        collection(this.firebaseService.db, 'nalangin_ledger'),
        orderBy('createdAt', 'desc')
      );
      onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as NalanginLedger));
          this.nalanginList.set(items);
        }
      }, () => {});
    } catch (e) {}
  }

  private listenToSavingsTargets(): void {
    try {
      const q = query(collection(this.firebaseService.db, 'savings_targets'));
      onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SavingsTarget));
          this.savingsTargets.set(items);
        }
      }, () => {});
    } catch (e) {}
  }

  private listenToExpenses(): void {
    this.expenses.set([]);

    try {
      const q = query(
        collection(this.firebaseService.db, 'expenses'), 
        orderBy('createdAt', 'desc')
      );

      onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const items: ExpenseItem[] = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          } as ExpenseItem));
          this.expenses.set(items);
        } else {
          this.expenses.set([]);
        }
        this.loading.set(false);
      }, () => {
        this.loading.set(false);
      });
    } catch (e) {
      this.loading.set(false);
    }
  }

  async addExpense(item: Omit<ExpenseItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = Date.now();
    const docRef = await addDoc(collection(this.firebaseService.db, 'expenses'), {
      ...item,
      createdAt: now,
      updatedAt: now
    });
    return docRef.id;
  }

  async updateExpense(id: string, updates: Partial<ExpenseItem>): Promise<void> {
    const docRef = doc(this.firebaseService.db, 'expenses', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Date.now()
    });
  }

  async deleteExpense(id: string): Promise<void> {
    const docRef = doc(this.firebaseService.db, 'expenses', id);
    await deleteDoc(docRef);
  }

  async resetAllExpensesToZero(): Promise<void> {
    const currentList = this.expenses();
    this.expenses.set([]);
    for (const item of currentList) {
      try {
        const docRef = doc(this.firebaseService.db, 'expenses', item.id);
        await deleteDoc(docRef);
      } catch (e) {}
    }
  }

  adjustAccountBalance(accountId: string, newBalance: number, reason: string): void {
    const currentAccs = this.accounts();
    const target = currentAccs.find(a => a.id === accountId);
    if (!target) return;

    const previousBalance = target.balance;
    const diff = newBalance - previousBalance;

    const updatedAccs = currentAccs.map(a => 
      a.id === accountId ? { ...a, balance: newBalance, updatedAt: Date.now() } : a
    );
    this.accounts.set(updatedAccs);

    const newLog: BalanceAdjustmentLog = {
      id: `log_${Date.now()}`,
      accountId,
      accountName: target.name,
      previousBalance,
      newBalance,
      difference: diff,
      reason,
      createdAt: Date.now()
    };

    this.balanceLogs.update(logs => [newLog, ...logs]);
  }

  async addNalanginItem(item: Omit<NalanginLedger, 'id' | 'createdAt'>): Promise<string> {
    const now = Date.now();
    const docRef = await addDoc(collection(this.firebaseService.db, 'nalangin_ledger'), {
      ...item,
      createdAt: now
    });
    return docRef.id;
  }

  async updateNalanginItem(id: string, updates: Partial<NalanginLedger>): Promise<void> {
    const docRef = doc(this.firebaseService.db, 'nalangin_ledger', id);
    await updateDoc(docRef, updates);
  }

  async toggleNalanginStatus(id: string): Promise<void> {
    const item = this.nalanginList().find(i => i.id === id);
    if (!item) return;
    const newStatus = item.status === 'pending' ? 'settled' : 'pending';
    const docRef = doc(this.firebaseService.db, 'nalangin_ledger', id);
    await updateDoc(docRef, { status: newStatus, settledAt: newStatus === 'settled' ? Date.now() : null });
  }

  async deleteNalanginItem(id: string): Promise<void> {
    const docRef = doc(this.firebaseService.db, 'nalangin_ledger', id);
    await deleteDoc(docRef);
  }

  async addSavingsTarget(target: Omit<SavingsTarget, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(this.firebaseService.db, 'savings_targets'), target);
    return docRef.id;
  }

  async updateSavingsTarget(id: string, updates: Partial<SavingsTarget>): Promise<void> {
    const docRef = doc(this.firebaseService.db, 'savings_targets', id);
    await updateDoc(docRef, updates);
  }

  async deleteSavingsTarget(id: string): Promise<void> {
    const docRef = doc(this.firebaseService.db, 'savings_targets', id);
    await deleteDoc(docRef);
  }

  transferFunds(fromAccountId: string, toAccountId: string, amount: number, notes: string): void {
    const accs = this.accounts();
    const fromAcc = accs.find(a => a.id === fromAccountId);
    const toAcc = accs.find(a => a.id === toAccountId);

    if (!fromAcc || !toAcc || amount <= 0 || fromAcc.balance < amount) {
      alert('Invalid transfer details or insufficient balance.');
      return;
    }

    const updated = accs.map(a => {
      if (a.id === fromAccountId) return { ...a, balance: a.balance - amount, updatedAt: Date.now() };
      if (a.id === toAccountId) return { ...a, balance: a.balance + amount, updatedAt: Date.now() };
      return a;
    });

    this.accounts.set(updated);
    this.transfers.update(t => [{
      id: `tr_${Date.now()}`,
      fromAccountId,
      fromAccountName: fromAcc.name,
      toAccountId,
      toAccountName: toAcc.name,
      amount,
      notes,
      createdAt: Date.now()
    }, ...t]);
  }

  exportFullBackupJson(): void {
    const backup: DatabaseBackup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      expenses: this.expenses(),
      accounts: this.accounts(),
      nalanginLedger: this.nalanginList(),
      savingsTargets: this.savingsTargets(),
      transfers: this.transfers()
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `budget_tracker_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  async restoreFullBackupJson(backupObj: DatabaseBackup): Promise<void> {
    if (!backupObj || !backupObj.expenses) {
      throw new Error('Invalid backup file format');
    }

    if (backupObj.expenses) {
      for (const item of backupObj.expenses) {
        await this.addExpense(item);
      }
    }
  }

  async updateCategoryBudget(id: string, newLimit: number): Promise<void> {
    const updated = this.categoryBudgets().map(b => 
      b.id === id ? { ...b, limitAmount: newLimit } : b
    );
    this.categoryBudgets.set(updated);
    try {
      const docRef = doc(this.firebaseService.db, 'budget_settings', id);
      await setDoc(docRef, { limitAmount: newLimit }, { merge: true });
    } catch (e) {}
  }

  calculateSummary(): ExpenseSummary {
    const currentList = this.expenses();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentYM = now.toISOString().substring(0, 7);
    const currentY = now.getFullYear().toString();

    // Start of current week (Monday)
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay() || 7;
    startOfWeek.setDate(startOfWeek.getDate() - day + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const initialBreakdown: Record<ExpenseCategory, number> = {
      food: 0,
      entertainment: 0,
      fixed: 0,
      vehicle: 0,
      utility: 0,
      other: 0
    };

    let total = 0;
    let todaySpent = 0;
    let thisWeekSpent = 0;
    let thisMonthSpent = 0;
    let thisYearSpent = 0;

    const categoryBreakdown = { ...initialBreakdown };

    for (const item of currentList) {
      total += item.amount;
      const itemDate = new Date(item.date);

      if (item.date === todayStr) {
        todaySpent += item.amount;
      }
      if (itemDate >= startOfWeek && itemDate <= now) {
        thisWeekSpent += item.amount;
      }
      if (item.date?.startsWith(currentYM)) {
        thisMonthSpent += item.amount;
      }
      if (item.date?.startsWith(currentY)) {
        thisYearSpent += item.amount;
      }

      if (categoryBreakdown[item.category] !== undefined) {
        categoryBreakdown[item.category] += item.amount;
      } else {
        categoryBreakdown.other += item.amount;
      }
    }

    const timeframeTotals: TimeframeTotals = {
      todaySpent,
      thisWeekSpent,
      thisMonthSpent,
      thisYearSpent
    };

    const warnings: BudgetCapWarning[] = [];
    
    // Evaluate configured category budgets against actual monthly spend
    for (const budget of this.categoryBudgets()) {
      const spent = categoryBreakdown[budget.key as ExpenseCategory] || 0;
      if (budget.limitAmount > 0 && spent > budget.limitAmount * 0.8) {
        const pct = Math.round((spent / budget.limitAmount) * 100);
        warnings.push({
          type: 'category_cap',
          title: `${budget.label} Near/Over Cap (${pct}%)`,
          percentage: pct,
          message: `${budget.label} spent Rp ${spent.toLocaleString('id-ID')} out of Rp ${budget.limitAmount.toLocaleString('id-ID')} monthly cap.`
        });
      }
    }

    return {
      totalAmount: total,
      totalItems: currentList.length,
      categoryBreakdown,
      monthlyBuffer: 2135700,
      timeframeTotals,
      warnings
    };
  }
}