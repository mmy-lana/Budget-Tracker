import { Injectable, signal, inject } from '@angular/core';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { 
  ExpenseItem, 
  ExpenseSummary, 
  ExpenseCategory, 
  PaymentAccount, 
  NalanginLedger, 
  BalanceAdjustmentLog,
  BudgetCapWarning 
} from '../models/expense.model';

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private firebaseService = inject(FirebaseService);

  readonly expenses = signal<ExpenseItem[]>([]);
  readonly accounts = signal<PaymentAccount[]>([
    { id: 'acc_jago', name: 'Bank Jago (Joint)', type: 'bank', balance: 12500000, updatedAt: Date.now() },
    { id: 'acc_bca', name: 'BCA', type: 'bank', balance: 8400000, updatedAt: Date.now() },
    { id: 'acc_mandiri', name: 'Mandiri', type: 'bank', balance: 3500000, updatedAt: Date.now() },
    { id: 'acc_gopay', name: 'GoPay', type: 'e-wallet', balance: 450000, updatedAt: Date.now() },
    { id: 'acc_cash', name: 'Cash', type: 'cash', balance: 750000, updatedAt: Date.now() }
  ]);
  readonly nalanginList = signal<NalanginLedger[]>([
    { id: 'nal_1', type: 'receivable', person: 'Budi (Colleague)', amount: 150000, notes: 'Nalangin lunch online delivery', status: 'pending', createdAt: Date.now() - 86400000 },
    { id: 'nal_2', type: 'payable', person: 'Siti (Wife)', amount: 200000, notes: 'Bought groceries with her cash', status: 'pending', createdAt: Date.now() - 172800000 }
  ]);
  readonly balanceLogs = signal<BalanceAdjustmentLog[]>([]);
  readonly loading = signal<boolean>(true);

  constructor() {
    this.listenToExpenses();
  }

  private listenToExpenses(): void {
    const initialMockExpenses: ExpenseItem[] = [
      { id: '1', title: 'Ikan Kembung per kg (6/7ekor)', amount: 44000, quantity: 2, unitPrice: 22000, category: 'food', subCategory: 'ingredients', date: '2026-07-30', createdBy: 'husband', paymentMethod: 'qris', paymentAccountId: 'acc_jago', createdAt: Date.now(), updatedAt: Date.now() },
      { id: '2', title: 'Fillet Paha Dadu per kg', amount: 90000, quantity: 2, unitPrice: 45000, category: 'food', subCategory: 'ingredients', date: '2026-07-29', createdBy: 'wife', paymentMethod: 'qris', paymentAccountId: 'acc_bca', createdAt: Date.now(), updatedAt: Date.now() },
      { id: '3', title: 'Telur Omega 10butir', amount: 90000, quantity: 3, unitPrice: 30000, category: 'food', subCategory: 'ingredients', date: '2026-07-28', createdBy: 'husband', paymentMethod: 'qris', paymentAccountId: 'acc_gopay', createdAt: Date.now(), updatedAt: Date.now() },
      { id: '4', title: 'Arabica Artisan Coffee', amount: 85000, quantity: 2, unitPrice: 42500, category: 'food', subCategory: 'cafe_coffee', date: '2026-07-27', createdBy: 'wife', paymentMethod: 'qris', paymentAccountId: 'acc_gopay', createdAt: Date.now(), updatedAt: Date.now() },
      { id: '5', title: 'Resto Dining Family Weekend', amount: 480000, quantity: 1, unitPrice: 480000, category: 'food', subCategory: 'resto_dining', date: '2026-07-26', createdBy: 'husband', paymentMethod: 'qris', paymentAccountId: 'acc_jago', createdAt: Date.now(), updatedAt: Date.now() },
      { id: '6', title: 'Wifi Monthly', amount: 283050, quantity: 1, unitPrice: 283050, category: 'fixed', subCategory: 'fixed', date: '2026-07-01', createdBy: 'husband', paymentMethod: 'debit', paymentAccountId: 'acc_mandiri', createdAt: Date.now(), updatedAt: Date.now() },
      { id: '7', title: 'Listrik Token', amount: 450000, quantity: 1, unitPrice: 450000, category: 'fixed', subCategory: 'fixed', date: '2026-07-05', createdBy: 'husband', paymentMethod: 'transfer', paymentAccountId: 'acc_bca', createdAt: Date.now(), updatedAt: Date.now() }
    ];

    this.expenses.set(initialMockExpenses);

    try {
      const q = query(
        collection(this.firebaseService.db, 'expenses'), 
        orderBy('date', 'desc')
      );

      onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const items: ExpenseItem[] = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          } as ExpenseItem));
          this.expenses.set(items);
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

  addNalanginItem(item: Omit<NalanginLedger, 'id' | 'createdAt'>): void {
    const newItem: NalanginLedger = {
      ...item,
      id: `nal_${Date.now()}`,
      createdAt: Date.now()
    };
    this.nalanginList.update(list => [newItem, ...list]);
  }

  settleNalanginItem(id: string): void {
    this.nalanginList.update(list => 
      list.map(item => item.id === id ? { ...item, status: 'settled', settledAt: Date.now() } : item)
    );
  }

  calculateSummary(): ExpenseSummary {
    const currentList = this.expenses();
    const initialBreakdown: Record<ExpenseCategory, number> = {
      food: 0,
      entertainment: 0,
      fixed: 0,
      vehicle: 0,
      utility: 0,
      other: 0
    };

    let total = 0;
    let foodSubTotal = 0;
    const categoryBreakdown = { ...initialBreakdown };

    for (const item of currentList) {
      total += item.amount;
      if (item.category === 'food') {
        foodSubTotal += item.amount;
      }
      if (categoryBreakdown[item.category] !== undefined) {
        categoryBreakdown[item.category] += item.amount;
      } else {
        categoryBreakdown.other += item.amount;
      }
    }

    const warnings: BudgetCapWarning[] = [];
    const foodTargetCap = 2000000; // 2 million IDR food allocation target
    const totalCycleTarget = 5000000; // 5 million overall cycle budget

    if (foodSubTotal > foodTargetCap * 0.3) {
      const pct = Math.round((foodSubTotal / foodTargetCap) * 100);
      warnings.push({
        type: 'food_subcategory',
        title: 'Food Budget Warning (>30%)',
        percentage: pct,
        message: `Food spend has reached ${pct}% of allocation cap (Rp ${foodSubTotal.toLocaleString('id-ID')}).`
      });
    }

    if (total > totalCycleTarget * 0.35) {
      const pct = Math.round((total / totalCycleTarget) * 100);
      warnings.push({
        type: 'overall_cycle',
        title: 'Overall Budget Cycle Alert (>35%)',
        percentage: pct,
        message: `Total monthly cycle expenditure has exceeded 35% threshold (${pct}% spent).`
      });
    }

    return {
      totalAmount: total,
      totalItems: currentList.length,
      categoryBreakdown,
      monthlyBuffer: 2135700,
      warnings
    };
  }
}