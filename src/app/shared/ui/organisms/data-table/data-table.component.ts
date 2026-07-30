import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpenseItem, ExpenseCategory } from '../../../../core/models/expense.model';
import { CurrencyIdrPipe } from '../../../pipes/currency-idr.pipe';
import { BadgeComponent } from '../../atoms/badge/badge.component';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, CurrencyIdrPipe, BadgeComponent],
  template: `
    <div class="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
      <!-- Search & Filters -->
      <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div class="relative flex-1 min-w-[200px]">
          <input 
            type="text"
            placeholder="Search expenses..."
            [value]="searchTerm()"
            (input)="onSearch($event)"
            class="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500" />
          <svg class="w-4 h-4 absolute left-3 top-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>

        <select 
          (change)="onCategoryFilter($event)"
          class="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="all">All Categories</option>
          <option value="food">Food</option>
          <option value="fixed">Fixed Expense</option>
          <option value="daily">Daily</option>
          <option value="vehicle">Vehicle</option>
        </select>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-xs font-semibold tracking-wider">
            <tr>
              <th class="px-5 py-3.5">Date</th>
              <th class="px-5 py-3.5">Item</th>
              <th class="px-5 py-3.5">Category</th>
              <th class="px-5 py-3.5">Qty</th>
              <th class="px-5 py-3.5 text-right">Amount</th>
              <th class="px-5 py-3.5 text-center">Receipt</th>
              <th class="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
            @for (item of filteredExpenses(); track item.id) {
              <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                <td class="px-5 py-4 whitespace-nowrap text-xs text-slate-500">{{ item.date }}</td>
                <td class="px-5 py-4 font-semibold text-slate-900 dark:text-white">{{ item.title }}</td>
                <td class="px-5 py-4">
                  <app-badge [variant]="getCategoryBadgeVariant(item.category)">
                    {{ item.category }}
                  </app-badge>
                </td>
                <td class="px-5 py-4 text-xs font-medium">{{ item.quantity }}</td>
                <td class="px-5 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                  {{ item.amount | currencyIdr }}
                </td>
                <td class="px-5 py-4 text-center">
                  @if (item.receiptImageUrl) {
                    <button 
                      (click)="viewReceipt.emit(item.receiptImageUrl)" 
                      class="text-xs text-emerald-600 hover:underline font-medium">
                      View
                    </button>
                  } @else {
                    <span class="text-xs text-slate-400">-</span>
                  }
                </td>
                <td class="px-5 py-4 text-right space-x-2">
                  <button (click)="editItem.emit(item)" class="text-xs text-slate-500 hover:text-emerald-600 font-medium">Edit</button>
                  <button (click)="deleteItem.emit(item.id)" class="text-xs text-rose-500 hover:text-rose-700 font-medium">Delete</button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="px-5 py-8 text-center text-slate-400">
                  No expense records found.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class DataTableComponent {
  expenses = input.required<ExpenseItem[]>();

  editItem = output<ExpenseItem>();
  deleteItem = output<string>();
  viewReceipt = output<string>();

  searchTerm = signal<string>('');
  selectedCategory = signal<string>('all');

  filteredExpenses = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const cat = this.selectedCategory();

    return this.expenses().filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(term);
      const matchesCat = cat === 'all' || item.category === cat;
      return matchesSearch && matchesCat;
    });
  });

  onSearch(e: Event): void {
    this.searchTerm.set((e.target as HTMLInputElement).value);
  }

  onCategoryFilter(e: Event): void {
    this.selectedCategory.set((e.target as HTMLSelectElement).value);
  }

  getCategoryBadgeVariant(category: ExpenseCategory): any {
    switch (category) {
      case 'food': return 'emerald';
      case 'fixed': return 'warning';
      case 'vehicle': return 'info';
      default: return 'neutral';
    }
  }
}