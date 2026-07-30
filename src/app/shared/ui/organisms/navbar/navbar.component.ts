import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserProfile } from '../../../../core/models/user.model';
import { ButtonComponent } from '../../atoms/button/button.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  template: `
    <header class="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <!-- Logo -->
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-600/30">
            ฿
          </div>
          <span class="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
            BudgetTracker <span class="text-xs text-emerald-600 font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950">2026</span>
          </span>
        </div>

        <!-- User Actions -->
        <div class="flex items-center gap-4">
          @if (user()) {
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-semibold text-slate-700 dark:text-slate-200 text-xs">
                {{ user()?.displayName?.substring(0, 2)?.toUpperCase() }}
              </div>
              <span class="text-xs font-semibold text-slate-700 dark:text-slate-200 hidden sm:inline">
                {{ user()?.displayName }}
              </span>
            </div>
            <app-button variant="ghost" size="sm" (btnClick)="logout.emit()">
              Logout
            </app-button>
          }
        </div>
      </div>
    </header>
  `
})
export class NavbarComponent {
  user = input<UserProfile | null>(null);
  logout = output<void>();
}