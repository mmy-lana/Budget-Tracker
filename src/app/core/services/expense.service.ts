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
    const q = query(
      collection(this.firebaseService.db, 'expenses'), 
      orderBy('date', 'desc')
    );

    onSnapshot(q, (snapshot) => {
      const items: ExpenseItem[] = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as ExpenseItem));

      this.expenses.set(items);
      this.loading.set(false);
    });
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