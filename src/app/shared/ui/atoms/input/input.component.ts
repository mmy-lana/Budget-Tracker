import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-1.5 w-full">
      @if (label()) {
        <label [for]="id()" class="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          {{ label() }}
          @if (required()) {
            <span class="text-rose-500">*</span>
          }
        </label>
      }

      <div class="relative flex items-center w-full">
        @if (prefixText()) {
          <span class="absolute left-3.5 text-sm font-semibold text-slate-500 pointer-events-none select-none">
            {{ prefixText() }}
          </span>
        }

        <input
          [id]="id()"
          [type]="type()"
          [value]="value()"
          [placeholder]="placeholder()"
          [disabled]="disabled()"
          [required]="required()"
          [class]="inputClasses"
          (input)="onInput($event)"
          (blur)="onBlur()" />

        @if (suffixText()) {
          <span class="absolute right-3.5 text-xs text-slate-400 pointer-events-none select-none">
            {{ suffixText() }}
          </span>
        }
      </div>

      @if (errorText()) {
        <p class="text-xs text-rose-500 font-medium mt-0.5 flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {{ errorText() }}
        </p>
      } @else if (helperText()) {
        <p class="text-xs text-slate-400 mt-0.5">{{ helperText() }}</p>
      }
    </div>
  `
})
export class InputComponent {
  id = input<string>(`input-${Math.random().toString(36).substring(2, 9)}`);
  type = input<string>('text');
  value = input<string | number>('');
  label = input<string>('');
  placeholder = input<string>('');
  prefixText = input<string>('');
  suffixText = input<string>('');
  helperText = input<string>('');
  errorText = input<string>('');
  disabled = input<boolean>(false);
  required = input<boolean>(false);

  valueChange = output<string>();
  blur = output<void>();

  get inputClasses(): string {
    const base = 'w-full rounded-xl text-sm font-medium transition-all duration-200 outline-none bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed';
    
    const paddingLeft = this.prefixText() ? 'pl-10' : 'pl-3.5';
    const paddingRight = this.suffixText() ? 'pr-12' : 'pr-3.5';
    const borderState = this.errorText() ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : '';

    return `${base} ${paddingLeft} ${paddingRight} ${borderState} py-2.5`;
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.valueChange.emit(target.value);
  }

  onBlur(): void {
    this.blur.emit();
  }
}