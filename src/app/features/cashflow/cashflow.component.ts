import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrencyIdrPipe } from '../../shared/pipes/currency-idr.pipe';
import { ExpenseService } from '../../core/services/expense.service';

@Component({
  selector: 'app-cashflow',
  standalone: true,
  imports: [CommonModule, CurrencyIdrPipe],
  template: `
    <div class="space-y-8">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white">Monthly Cash Flow</h1>
          <p class="text-xs text-slate-500 mt-1">Live income allocation vs actual logged expenses & monthly savings buffer</p>
        </div>

        <!-- Dynamic Month & Year Selector -->
        <div class="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
          <span>📅 Period:</span>
          <select [value]="selectedMonth()" (change)="selectedMonth.set($any($event.target).value)" class="bg-transparent outline-none">
            <option value="01">Jan</option>
            <option value="02">Feb</option>
            <option value="03">Mar</option>
            <option value="04">Apr</option>
            <option value="05">May</option>
            <option value="06">Jun</option>
            <option value="07">Jul</option>
            <option value="08">Aug</option>
            <option value="09">Sep</option>
            <option value="10">Oct</option>
            <option value="11">Nov</option>
            <option value="12">Dec</option>
          </select>
          <select [value]="selectedYear()" (change)="selectedYear.set($any($event.target).value)" class="bg-transparent outline-none">
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
            <option value="2028">2028</option>
          </select>
        </div>
      </div>

      <!-- Cashflow Card Matrix -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Income Panel -->
        <div class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-emerald-500"></span> Total Monthly Income
            </h2>
            <span class="text-xl font-bold text-emerald-600">{{ totalIncome | currencyIdr }}</span>
          </div>

          <div class="space-y-3 text-sm">
            <div class="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800">
              <span class="text-slate-600 dark:text-slate-400">Husband Salary (Suami)</span>
              <span class="font-semibold">{{ 8000000 | currencyIdr }}</span>
            </div>
            <div class="flex justify-between py-2">
              <span class="text-slate-600 dark:text-slate-400">Wife Salary (Istri)</span>
              <span class="font-semibold">{{ 7750000 | currencyIdr }}</span>
            </div>
          </div>
        </div>

        <!-- Expenses & Savings Panel -->
        <div class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-rose-500"></span> Total Logged Expenses
            </h2>
            <span class="text-xl font-bold text-rose-600">{{ monthlyTotalSpent() | currencyIdr }}</span>
          </div>

          <div class="space-y-3 text-sm">
            <div class="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800">
              <span class="text-slate-600 dark:text-slate-400">Fixed Expenses</span>
              <span class="font-semibold text-rose-500">{{ fixedExpensesSpent() | currencyIdr }}</span>
            </div>
            <div class="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800">
              <span class="text-slate-600 dark:text-slate-400">Variable / Daily Needs</span>
              <span class="font-semibold text-amber-500">{{ variableExpensesSpent() | currencyIdr }}</span>
            </div>
            <div class="flex justify-between py-2">
              <span class="text-slate-600 dark:text-slate-400">Fixed Monthly Saving Allocation</span>
              <span class="font-semibold text-sky-500">{{ totalSavingsAllocation() | currencyIdr }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Net Monthly Buffer Banner -->
      <div class="p-6 rounded-3xl bg-emerald-900 text-white flex items-center justify-between shadow-xl">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-emerald-400">Net Monthly Surplus</span>
          <h3 class="text-3xl font-extrabold mt-1">{{ netSurplus() | currencyIdr }}</h3>
          <p class="text-xs text-slate-300 mt-1">Available buffer for unallocated needs in {{ selectedMonth() }}/{{ selectedYear() }}</p>
        </div>
        <div class="p-4 rounded-2xl bg-emerald-800/80 text-2xl">
          🛡️
        </div>
      </div>
    </div>
  `
})
export class CashflowComponent {
  expenseService = inject(ExpenseService);

  selectedMonth = signal<string>(new Date().toISOString().split('-')[1]);
  selectedYear = signal<string>(new Date().getFullYear().toString());

  totalIncome = 15750000;

  filteredExpenses = computed(() => {
    const ym = `${this.selectedYear()}-${this.selectedMonth()}`;
    return this.expenseService.expenses().filter(e => e.date?.startsWith(ym));
  });

  monthlyTotalSpent = computed(() => 
    this.filteredExpenses().reduce((sum, e) => sum + e.amount, 0)
  );

  fixedExpensesSpent = computed(() => 
    this.filteredExpenses().filter(e => e.category === 'fixed').reduce((sum, e) => sum + e.amount, 0)
  );

  variableExpensesSpent = computed(() => 
    this.filteredExpenses().filter(e => e.category !== 'fixed').reduce((sum, e) => sum + e.amount, 0)
  );

  totalSavingsAllocation = computed(() => 
    this.expenseService.savingsTargets().reduce((sum, t) => sum + (t.monthlyAllocation || 0), 0)
  );

  netSurplus = computed(() => 
    this.totalIncome - this.monthlyTotalSpent() - this.totalSavingsAllocation()
  );
}