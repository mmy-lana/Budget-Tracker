import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrencyIdrPipe } from '../../shared/pipes/currency-idr.pipe';
import { ExpenseService } from '../../core/services/expense.service';
import { SavingsTarget } from '../../core/models/cashflow.model';
import { ButtonComponent } from '../../shared/ui/atoms/button/button.component';

@Component({
  selector: 'app-savings',
  standalone: true,
  imports: [CommonModule, CurrencyIdrPipe, ButtonComponent],
  template: `
    <div class="space-y-8 max-w-6xl mx-auto">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            🎯 Target Savings
          </h1>
          <p class="text-xs text-slate-500 mt-1">Emergency fund & long-term commitments interactive tracker</p>
        </div>

        <app-button variant="primary" (btnClick)="openAddModal()">
          + Add Savings Goal
        </app-button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        @for (target of expenseService.savingsTargets(); track target.id) {
          <div class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="font-bold text-slate-900 dark:text-white">{{ target.title }}</h3>
              <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                {{ target.deadlineMonths }} Months
              </span>
            </div>

            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-slate-500">Saved: <strong class="text-emerald-600">{{ target.currentAmount | currencyIdr }}</strong></span>
                <span class="font-bold">Target: {{ target.targetAmount | currencyIdr }}</span>
              </div>

              <div class="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                <div class="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  [style.width.%]="getProgressPercent(target)"></div>
              </div>

              <div class="flex justify-between items-center text-xs text-slate-400">
                <span>Allocation: {{ target.monthlyAllocation | currencyIdr }}/mo</span>
                <span>{{ getProgressPercent(target) }}% Completed</span>
              </div>
            </div>

            <!-- Card Actions & Freelance Deposit Top-up -->
            <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <button 
                (click)="openDepositModal(target)"
                class="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-semibold shadow-xs">
                + Add Deposit (Freelance)
              </button>

              <div class="flex items-center gap-3">
                <button (click)="openEditModal(target)" class="px-2.5 py-1 text-xs text-slate-500 hover:text-emerald-600 font-semibold">
                  ✏️ Edit
                </button>
                <button (click)="confirmDelete(target.id)" class="px-2.5 py-1 text-xs text-rose-500 hover:text-rose-700 font-semibold">
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- Savings Modal -->
    @if (isModalOpen()) {
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
          <h2 class="text-lg font-bold">{{ editingTarget() ? 'Edit Savings Goal' : 'Add Savings Goal' }}</h2>

          <div class="space-y-3">
            <div>
              <label class="text-xs font-semibold uppercase text-slate-500">Goal Title</label>
              <input type="text" [value]="formTitle()" (input)="formTitle.set($any($event.target).value)" placeholder="e.g. Dana Darurat Target"
                class="w-full mt-1 p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 text-sm outline-none" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-semibold uppercase text-slate-500">Target Goal (Rp)</label>
                <input type="number" [value]="formTargetAmount()" (input)="formTargetAmount.set(+$any($event.target).value)"
                  class="w-full mt-1 p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none" />
              </div>
              <div>
                <label class="text-xs font-semibold uppercase text-slate-500">Current Saved (Rp)</label>
                <input type="number" [value]="formCurrentAmount()" (input)="formCurrentAmount.set(+$any($event.target).value)"
                  class="w-full mt-1 p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-semibold uppercase text-slate-500">Monthly Allocation (Rp)</label>
                <input type="number" [value]="formMonthlyAllocation()" (input)="formMonthlyAllocation.set(+$any($event.target).value)"
                  class="w-full mt-1 p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 text-sm outline-none" />
              </div>
              <div>
                <label class="text-xs font-semibold uppercase text-slate-500">Deadline (Months)</label>
                <input type="number" [value]="formDeadlineMonths()" (input)="formDeadlineMonths.set(+$any($event.target).value)"
                  class="w-full mt-1 p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 text-sm outline-none" />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <app-button variant="ghost" (btnClick)="isModalOpen.set(false)">Cancel</app-button>
            <app-button variant="primary" (btnClick)="saveTarget()">Save Goal</app-button>
          </div>
        </div>
      </div>
    }

    <!-- Deposit / Freelance Income Modal -->
    @if (isDepositModalOpen()) {
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
          <h2 class="text-lg font-bold">💵 Add Deposit: {{ activeDepositTarget()?.title }}</h2>

          <div class="space-y-3">
            <div>
              <label class="text-xs font-semibold uppercase text-slate-500">Deposit Amount (Rp)</label>
              <input type="number" [value]="depositNominal()" (input)="depositNominal.set(+$any($event.target).value)" placeholder="e.g. 500000"
                class="w-full mt-1 p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none" />
            </div>

            <div>
              <label class="text-xs font-semibold uppercase text-slate-500">Source / Notes</label>
              <input type="text" [value]="depositNotes()" (input)="depositNotes.set($any($event.target).value)" placeholder="e.g. Freelance web design payment"
                class="w-full mt-1 p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 text-sm outline-none" />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <app-button variant="ghost" (btnClick)="isDepositModalOpen.set(false)">Cancel</app-button>
            <app-button variant="primary" (btnClick)="submitDeposit()">Top Up Saved Amount</app-button>
          </div>
        </div>
      </div>
    }
  `
})
export class SavingsComponent {
  expenseService = inject(ExpenseService);

  isModalOpen = signal<boolean>(false);
  editingTarget = signal<SavingsTarget | null>(null);

  formTitle = signal<string>('');
  formTargetAmount = signal<number>(0);
  formCurrentAmount = signal<number>(0);
  formMonthlyAllocation = signal<number>(0);
  formDeadlineMonths = signal<number>(12);

  isDepositModalOpen = signal<boolean>(false);
  activeDepositTarget = signal<SavingsTarget | null>(null);
  depositNominal = signal<number>(0);
  depositNotes = signal<string>('');

  getProgressPercent(t: SavingsTarget): number {
    if (!t.targetAmount || t.targetAmount <= 0) return 0;
    return Math.min(100, Math.round((t.currentAmount / t.targetAmount) * 100));
  }

  openDepositModal(target: SavingsTarget): void {
    this.activeDepositTarget.set(target);
    this.depositNominal.set(0);
    this.depositNotes.set('');
    this.isDepositModalOpen.set(true);
  }

  async submitDeposit(): Promise<void> {
    const target = this.activeDepositTarget();
    if (!target || this.depositNominal() <= 0) {
      alert('Please enter a valid deposit nominal.');
      return;
    }
    const newCurrent = target.currentAmount + this.depositNominal();
    await this.expenseService.updateSavingsTarget(target.id, { currentAmount: newCurrent });
    this.isDepositModalOpen.set(false);
  }

  async confirmDelete(id: string): Promise<void> {
    if (confirm('Are you sure you want to delete this savings target?')) {
      await this.expenseService.deleteSavingsTarget(id);
    }
  }

  openAddModal(): void {
    this.editingTarget.set(null);
    this.formTitle.set('');
    this.formTargetAmount.set(0);
    this.formCurrentAmount.set(0);
    this.formMonthlyAllocation.set(0);
    this.formDeadlineMonths.set(12);
    this.isModalOpen.set(true);
  }

  openEditModal(target: SavingsTarget): void {
    this.editingTarget.set(target);
    this.formTitle.set(target.title);
    this.formTargetAmount.set(target.targetAmount);
    this.formCurrentAmount.set(target.currentAmount);
    this.formMonthlyAllocation.set(target.monthlyAllocation);
    this.formDeadlineMonths.set(target.deadlineMonths);
    this.isModalOpen.set(true);
  }

  async saveTarget(): Promise<void> {
    if (!this.formTitle().trim() || this.formTargetAmount() <= 0) {
      alert('Please fill in target title and nominal goal.');
      return;
    }

    if (this.editingTarget()) {
      await this.expenseService.updateSavingsTarget(this.editingTarget()!.id, {
        title: this.formTitle().trim(),
        targetAmount: this.formTargetAmount(),
        currentAmount: this.formCurrentAmount(),
        monthlyAllocation: this.formMonthlyAllocation(),
        deadlineMonths: this.formDeadlineMonths()
      });
    } else {
      await this.expenseService.addSavingsTarget({
        title: this.formTitle().trim(),
        targetAmount: this.formTargetAmount(),
        currentAmount: this.formCurrentAmount(),
        monthlyAllocation: this.formMonthlyAllocation(),
        deadlineMonths: this.formDeadlineMonths()
      });
    }

    this.isModalOpen.set(false);
  }
}