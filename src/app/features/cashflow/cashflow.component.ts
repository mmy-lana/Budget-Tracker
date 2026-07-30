import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrencyIdrPipe } from '../../shared/pipes/currency-idr.pipe';

@Component({
  selector: 'app-cashflow',
  standalone: true,
  imports: [CommonModule, CurrencyIdrPipe],
  template: `
    <div class="space-y-8">
      <div>
        <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white">Monthly Cash Flow</h1>
        <p class="text-xs text-slate-500 mt-1">Income allocation vs fixed expenses & monthly savings buffer</p>
      </div>

      <!-- Cashflow Card Matrix -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Income Panel -->
        <div class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-emerald-500"></span> Total Income
            </h2>
            <span class="text-xl font-bold text-emerald-600">{{ 15750000 | currencyIdr }}</span>
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
              <span class="w-3 h-3 rounded-full bg-rose-500"></span> Total Committed Expense
            </h2>
            <span class="text-xl font-bold text-rose-600">{{ 13614300 | currencyIdr }}</span>
          </div>

          <div class="space-y-3 text-sm">
            <div class="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800">
              <span class="text-slate-600 dark:text-slate-400">Fixed Expenses (Bills/Rent/Food)</span>
              <span class="font-semibold text-rose-500">{{ 5107150 | currencyIdr }}</span>
            </div>
            <div class="flex justify-between py-2">
              <span class="text-slate-600 dark:text-slate-400">Fixed Monthly Saving Target</span>
              <span class="font-semibold text-sky-500">{{ 8507150 | currencyIdr }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Net Monthly Buffer Banner -->
      <div class="p-6 rounded-3xl bg-emerald-900 text-white flex items-center justify-between shadow-xl">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-emerald-400">Net Liquid Surplus</span>
          <h3 class="text-3xl font-extrabold mt-1">{{ 2135700 | currencyIdr }}</h3>
          <p class="text-xs text-slate-300 mt-1">Monthly buffer available for unallocated daily needs</p>
        </div>
        <div class="p-4 rounded-2xl bg-emerald-800/80 text-2xl">
          🛡️
        </div>
      </div>
    </div>
  `
})
export class CashflowComponent {}