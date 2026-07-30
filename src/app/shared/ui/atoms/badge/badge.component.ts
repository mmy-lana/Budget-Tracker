import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant = 'emerald' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type BadgeSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span 
      [class]="badgeClasses"
      aria-label="Status badge">
      @if (showDot()) {
        <span [class]="dotClasses" aria-hidden="true"></span>
      }
      <ng-content></ng-content>
    </span>
  `
})
export class BadgeComponent {
  variant = input<BadgeVariant>('emerald');
  size = input<BadgeSize>('md');
  showDot = input<boolean>(false);

  get badgeClasses(): string {
    const base = 'inline-flex items-center gap-1.5 font-medium rounded-full transition-colors duration-150';
    
    const sizeMap: Record<BadgeSize, string> = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-xs',
      lg: 'px-3 py-1.5 text-sm'
    };

    const variantMap: Record<BadgeVariant, string> = {
      emerald: 'bg-emerald-100 text-emerald-800 border border-emerald-200/60 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/40',
      success: 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800/40',
      warning: 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/40',
      danger: 'bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/40',
      info: 'bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/40',
      neutral: 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
    };

    return `${base} ${sizeMap[this.size()]} ${variantMap[this.variant()]}`;
  }

  get dotClasses(): string {
    const dotBase = 'w-1.5 h-1.5 rounded-full';
    const dotVariantMap: Record<BadgeVariant, string> = {
      emerald: 'bg-emerald-500 animate-pulse',
      success: 'bg-green-500',
      warning: 'bg-amber-500',
      danger: 'bg-rose-500',
      info: 'bg-sky-500',
      neutral: 'bg-slate-400'
    };
    return `${dotBase} ${dotVariantMap[this.variant()]}`;
  }
}