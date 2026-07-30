import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrencyIdrPipe } from '../../shared/pipes/currency-idr.pipe';

@Component({
  selector: 'app-savings',
  standalone: true,
  imports: [CommonModule, CurrencyIdrPipe],
  template: `
    <div class="space-y-8">
      <div>
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white">Target Savings</h1>
        <p class="text-xs text-slate-500 mt-1">Emergency fund & long-term commitments tracker</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Emergency Fund Card -->
        <div class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-slate-900 dark:text-white">Dana Darurat Target</h3>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">6 Months</span>
          </div>

          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-slate-500">Target Goal</span>
              <span class="font-bold">{{ 30642900 | currencyIdr }}</span>
            </div>
            <div class="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
              <div class="bg-emerald-500 h-full w-[65%] rounded-full"></div>
            </div>
            <p class="text-xs text-slate-400 text-right">Monthly commitment: {{ 5107150 | currencyIdr }}/mo</p>
          </div>
        </div>

        <!-- Apartment Rent Savings -->
        <div class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-slate-900 dark:text-white">Sewa Apartemen Target</h3>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-100 text-sky-800">12 Months</span>
          </div>

          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-slate-500">Target Goal</span>
              <span class="font-bold">{{ 20400000 | currencyIdr }}</span>
            </div>
            <div class="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
              <div class="bg-sky-500 h-full w-[80%] rounded-full"></div>
            </div>
            <p class="text-xs text-slate-400 text-right">Monthly commitment: {{ 1700000 | currencyIdr }}/mo</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SavingsComponent {}