import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || loading()"
      [class]="buttonClasses"
      (click)="onClick($event)">
      @if (loading()) {
        <svg 
          class="animate-spin -ml-1 mr-2 h-4 w-4 text-current" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
          aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      }
      <ng-content></ng-content>
    </button>
  `
})
export class ButtonComponent {
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('md');
  type = input<'button' | 'submit' | 'reset'>('button');
  fullWidth = input<boolean>(false);
  disabled = input<boolean>(false);
  loading = input<boolean>(false);

  btnClick = output<MouseEvent>();

  get buttonClasses(): string {
    const base = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-xl active:scale-[0.98]';

    const width = this.fullWidth() ? 'w-full' : '';

    const sizeMap: Record<ButtonSize, string> = {
      sm: 'px-3 py-1.5 text-xs gap-1.5 shadow-sm',
      md: 'px-4 py-2 text-sm gap-2 shadow-sm',
      lg: 'px-5 py-2.5 text-base gap-2.5 shadow-md'
    };

    const variantMap: Record<ButtonVariant, string> = {
      primary: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 border border-emerald-600 shadow-emerald-600/20',
      secondary: 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 focus:ring-emerald-500 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800/40',
      outline: 'bg-transparent text-slate-700 hover:bg-slate-50 focus:ring-emerald-500 border border-slate-300 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800',
      ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-emerald-500 border border-transparent dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
      danger: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 border border-rose-600 shadow-rose-600/20'
    };

    return `${base} ${width} ${sizeMap[this.size()]} ${variantMap[this.variant()]}`;
  }

  onClick(event: MouseEvent): void {
    if (!this.disabled() && !this.loading()) {
      this.btnClick.emit(event);
    }
  }
}