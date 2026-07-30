import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrencyIdrPipe } from '../../../pipes/currency-idr.pipe';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, CurrencyIdrPipe],
  template: `
    <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {{ title() }}
        </span>
        <div [class]="iconBgClasses">
          <ng-content select="[icon]"></ng-content>
        </div>
      </div>

      <div class="mt-3 flex items-baseline justify-between gap-2">
        <h3 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          @if (isCurrency()) {
            {{ value() | currencyIdr: false: true }}
          } @else {
            {{ value() }}
          }
        </h3>

        @if (trendText()) {
          <span [class]="trendClasses">
            {{ trendText() }}
          </span>
        }
      </div>

      @if (subtext()) {
        <p class="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
          {{ subtext() }}
        </p>
      }
    </div>
  `
})
export class StatCardComponent {
  title = input.required<string>();
  value = input.required<number | string>();
  isCurrency = input<boolean>(true);
  subtext = input<string>('');
  trendText = input<string>('');
  trendType = input<'up' | 'down' | 'neutral'>('neutral');
  accentColor = input<'emerald' | 'rose' | 'amber' | 'sky'>('emerald');

  get iconBgClasses(): string {
    const colorMap = {
      emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
      rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400',
      amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
      sky: 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400'
    };
    return `p-2.5 rounded-xl border border-transparent ${colorMap[this.accentColor()]}`;
  }

  get trendClasses(): string {
    const base = 'text-xs font-semibold px-2 py-0.5 rounded-full';
    if (this.trendType() === 'up') return `${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300`;
    if (this.trendType() === 'down') return `${base} bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300`;
    return `${base} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300`;
  }
}