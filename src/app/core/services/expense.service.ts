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
import { ExpenseItem, ExpenseSummary, ExpenseCategory } from '../models/expense.model';

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private firebaseService = inject(FirebaseService);

  readonly expenses = signal<ExpenseItem[]>([]);
  readonly loading = signal<boolean>(true);

  constructor() {
    this.listenToExpenses();
  }

  private listenToExpenses(): void {
    const initialMockExpenses: ExpenseItem[] = [
      { id: '1', title: 'Ikan Kembung per kg (6/7ekor)', amount: 44000, quantity: 2, unitPrice: 22000, category: 'food', date: '2026-07-30', createdBy: 'husband', paymentMethod: 'qris', createdAt: Date.now(), updatedAt: Date.now() },
      { id: '2', title: 'Fillet Paha Dadu per kg', amount: 90000, quantity: 2, unitPrice: 45000, category: 'food', date: '2026-07-29', createdBy: 'wife', paymentMethod: 'qris', createdAt: Date.now(), updatedAt: Date.now() },
      { id: '3', title: 'Telur Omega 10butir', amount: 90000, quantity: 3, unitPrice: 30000, category: 'food', date: '2026-07-28', createdBy: 'husband', paymentMethod: 'qris', createdAt: Date.now(), updatedAt: Date.now() },
      { id: '4', title: 'Pisang Cavendish 500g', amount: 26000, quantity: 2, unitPrice: 13000, category: 'food', date: '2026-07-27', createdBy: 'wife', paymentMethod: 'qris', createdAt: Date.now(), updatedAt: Date.now() },
      { id: '5', title: 'Alpukat Mentega 500g', amount: 48000, quantity: 2, unitPrice: 24000, category: 'food', date: '2026-07-26', createdBy: 'husband', paymentMethod: 'qris', createdAt: Date.now(), updatedAt: Date.now() },
      { id: '6', title: 'Wifi Monthly', amount: 283050, quantity: 1, unitPrice: 283050, category: 'fixed', date: '2026-07-01', createdBy: 'husband', paymentMethod: 'debit', createdAt: Date.now(), updatedAt: Date.now() },
      { id: '7', title: 'Listrik Token', amount: 450000, quantity: 1, unitPrice: 450000, category: 'fixed', date: '2026-07-05', createdBy: 'husband', paymentMethod: 'transfer', createdAt: Date.now(), updatedAt: Date.now() }
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
      }, (err) => {
        // Fallback to mock data on unauthenticated permission errors
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

  calculateSummary(): ExpenseSummary {
    const currentList = this.expenses();
    const initialBreakdown: Record<ExpenseCategory, number> = {
      fixed: 0,
      food: 0,
      daily: 0,
      savings: 0,
      bills: 0,
      entertainment: 0,
      vehicle: 0,
      other: 0
    };

    let total = 0;
    const categoryBreakdown = { ...initialBreakdown };

    for (const item of currentList) {
      total += item.amount;
      if (categoryBreakdown[item.category] !== undefined) {
        categoryBreakdown[item.category] += item.amount;
      } else {
        categoryBreakdown.other += item.amount;
      }
    }

    return {
      totalAmount: total,
      totalItems: currentList.length,
      categoryBreakdown,
      monthlyBuffer: 2135700
    };
  }
}