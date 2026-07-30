import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpenseItem, ExpenseCategory } from '../../../../core/models/expense.model';
import { CurrencyIdrPipe } from '../../../pipes/currency-idr.pipe';
import { BadgeComponent } from '../../atoms/badge/badge.component';

export type TimeframeFilter = 'daily' | 'weekly' | 'monthly' | 'last_month' | 'all';
export type CategoryTab = 'all' | 'food' | 'fixed' | 'vehicle' | 'entertainment' | 'shared_nalangin';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, CurrencyIdrPipe, BadgeComponent],
  template: `
    <div class="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden space-y-3">
      
      <!-- Segmented Tab Filters (Category) -->
      <div class="p-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
        <div class="flex items-center gap-1.5">
          @for (tab of categoryTabs; track tab.id) {
            <button
              (click)="activeTab.set(tab.id)"
              [class]="activeTab() === tab.id 
                ? 'bg-emerald-600 text-white font-semibold shadow-sm' 
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'"
              class="px-3 py-1.5 text-xs rounded-xl transition-all whitespace-nowrap">
              {{ tab.label }}
            </button>
          }
        </div>

        <!-- Timeframe View Filters (Today, This Week, This Month, Select Month + Year) -->
        <div class="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
          <button 
            (click)="activeTimeframe.set('today')" 
            [class]="activeTimeframe() === 'today' ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'"
            class="px-2.5 py-1 rounded-lg transition-all whitespace-nowrap">
            Today
          </button>
          <button 
            (click)="activeTimeframe.set('week')" 
            [class]="activeTimeframe() === 'week' ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'"
            class="px-2.5 py-1 rounded-lg transition-all whitespace-nowrap">
            This Week
          </button>
          <button 
            (click)="activeTimeframe.set('month')" 
            [class]="activeTimeframe() === 'month' ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'"
            class="px-2.5 py-1 rounded-lg transition-all whitespace-nowrap">
            This Month
          </button>
          <button 
            (click)="activeTimeframe.set('custom')" 
            [class]="activeTimeframe() === 'custom' ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'"
            class="px-2.5 py-1 rounded-lg transition-all whitespace-nowrap">
            Select Month + Year
          </button>

          @if (activeTimeframe() === 'custom') {
            <div class="flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-700 font-bold text-[11px]">
              <select [value]="selectedMonth()" (change)="selectedMonth.set($any($event.target).value)" class="bg-transparent outline-none">
                <option value="all">All Months</option>
                <option value="01">Jan (01)</option>
                <option value="02">Feb (02)</option>
                <option value="03">Mar (03)</option>
                <option value="04">Apr (04)</option>
                <option value="05">May (05)</option>
                <option value="06">Jun (06)</option>
                <option value="07">Jul (07)</option>
                <option value="08">Aug (08)</option>
                <option value="09">Sep (09)</option>
                <option value="10">Oct (10)</option>
                <option value="11">Nov (11)</option>
                <option value="12">Dec (12)</option>
              </select>
              <select [value]="selectedYear()" (change)="selectedYear.set($any($event.target).value)" class="bg-transparent outline-none">
                <option value="all">All Years</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
              </select>
            </div>
          }
        </div>
      </div>

      <!-- Search Field -->
      <div class="px-4 flex items-center justify-between gap-3">
        <div class="relative flex-1">
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
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-xs font-semibold tracking-wider">
            <tr>
              <th class="px-5 py-3.5">Date</th>
              <th class="px-5 py-3.5">Item</th>
              <th class="px-5 py-3.5">Sub-Category</th>
              <th class="px-5 py-3.5">Qty</th>
              <th class="px-5 py-3.5 text-right">Amount</th>
              <th class="px-5 py-3.5 text-center">Receipt</th>
              <th class="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
            @for (item of filteredExpenses(); track item.id) {
              <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                <td class="px-5 py-4 whitespace-nowrap text-xs text-slate-500">
                  <div class="font-semibold text-slate-900 dark:text-slate-100">{{ item.date }}</div>
                  <div class="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                    {{ item.createdAt ? (item.createdAt | date:'HH:mm:ss') : '00:00:00' }}
                  </div>
                </td>
                <td class="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                  {{ item.title }}
                  @if (item.storeName) {
                    <span class="block text-[10px] text-slate-400 font-normal">📍 {{ item.storeName }}</span>
                  }
                </td>
                <td class="px-5 py-4">
                  <app-badge [variant]="getCategoryBadgeVariant(item.category)">
                    {{ item.subCategory || item.category }}
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
  activeTab = signal<CategoryTab>('all');
  activeTimeframe = signal<'today' | 'week' | 'month' | 'custom'>('month');
  selectedMonth = signal<string>(new Date().toISOString().split('-')[1]);
  selectedYear = signal<string>(new Date().getFullYear().toString());

  categoryTabs: { id: CategoryTab; label: string }[] = [
    { id: 'all', label: 'All Transactions' },
    { id: 'food', label: '🥗 Food' },
    { id: 'fixed', label: '⚡ Fixed' },
    { id: 'vehicle', label: '🚗 Vehicle' },
    { id: 'entertainment', label: '🎬 Entertainment' },
    { id: 'shared_nalangin', label: '🤝 Shared/Nalangin' }
  ];

  filteredExpenses = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const tab = this.activeTab();
    const tf = this.activeTimeframe();
    const selM = this.selectedMonth();
    const selY = this.selectedYear();
    const todayStr = new Date().toISOString().split('T')[0];

    return this.expenses().filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(term);
      let matchesTab = true;

      if (tab === 'shared_nalangin') {
        matchesTab = item.notes?.toLowerCase().includes('nalangin') || item.createdBy.includes('nalangin');
      } else if (tab !== 'all') {
        matchesTab = item.category === tab;
      }

      let matchesTf = true;
      if (tf === 'today') {
        matchesTf = item.date === todayStr;
      } else if (tf === 'week') {
        const itemDate = new Date(item.date);
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        matchesTf = itemDate >= startOfWeek && itemDate <= endOfWeek;
      } else if (tf === 'month') {
        const currentYM = new Date().toISOString().substring(0, 7);
        matchesTf = item.date?.startsWith(currentYM);
      } else if (tf === 'custom') {
        const itemYearMonth = item.date?.substring(0, 7) || '';
        const [itemY, itemM] = itemYearMonth.split('-');
        const matchesMonth = selM === 'all' || itemM === selM;
        const matchesYear = selY === 'all' || itemY === selY;
        matchesTf = matchesMonth && matchesYear;
      }

      return matchesSearch && matchesTab && matchesTf;
    }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  });

  onSearch(e: Event): void {
    this.searchTerm.set((e.target as HTMLInputElement).value);
  }

  getCategoryBadgeVariant(category: ExpenseCategory): any {
    switch (category) {
      case 'food': return 'emerald';
      case 'fixed': return 'warning';
      case 'vehicle': return 'info';
      case 'entertainment': return 'danger';
      default: return 'neutral';
    }
  }
}