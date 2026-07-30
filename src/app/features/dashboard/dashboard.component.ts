import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ExpenseService } from '../../core/services/expense.service';
import { StatCardComponent } from '../../shared/ui/molecules/stat-card/stat-card.component';
import { ExpenseChartComponent } from '../../shared/ui/organisms/expense-chart/expense-chart.component';
import { DataTableComponent } from '../../shared/ui/organisms/data-table/data-table.component';
import { ButtonComponent } from '../../shared/ui/atoms/button/button.component';
import { CurrencyIdrPipe } from '../../shared/pipes/currency-idr.pipe';
import { ExpenseItem, PaymentAccount } from '../../core/models/expense.model';
import { ExpenseEditorComponent } from '../expenses/expense-editor/expense-editor.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink, 
    StatCardComponent, 
    ExpenseChartComponent, 
    DataTableComponent, 
    ButtonComponent,
    CurrencyIdrPipe,
    ExpenseEditorComponent
  ],
  template: `
    <div class="space-y-8">
      <!-- Header Banner -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Household Budget Summary
          </h1>
          <p class="text-xs text-slate-500 mt-1">Real-time expenditure tracking & multi-account balance audit</p>
        </div>
        
        <div class="flex items-center gap-3">
          <app-button variant="primary" (btnClick)="openCreateModal()">
            + Add Expense
          </app-button>
        </div>
      </div>

      <!-- Rule 5: Visual Budget Cap Warning Alert Banner -->
      @if (summary().warnings.length > 0) {
        <div class="space-y-3">
          @for (warn of summary().warnings; track warn.title) {
            <div class="p-4 rounded-2xl bg-rose-500 text-white shadow-lg flex items-center justify-between border border-rose-600 animate-pulse">
              <div class="flex items-center gap-3">
                <span class="text-2xl">⚠️</span>
                <div>
                  <h4 class="font-bold text-sm uppercase tracking-wider">{{ warn.title }}</h4>
                  <p class="text-xs text-rose-100 mt-0.5">{{ warn.message }}</p>
                </div>
              </div>
              <span class="text-lg font-black bg-rose-700/60 px-3 py-1 rounded-xl">{{ warn.percentage }}%</span>
            </div>
          }
        </div>
      }

      <!-- Quick Stat Cards: Timeframe Totals (Today, Week, Month, Year) -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            ⏱️ Timeframe Expenditure Velocity
          </h2>
          <app-button variant="outline" size="sm" (btnClick)="isBudgetConfigOpen.set(true)">
            ⚙️ Set Budget Caps
          </app-button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <app-stat-card 
            title="Today's Spent" 
            [value]="summary().timeframeTotals.todaySpent" 
            accentColor="emerald"
            subtext="Logged today">
            <span icon>📅</span>
          </app-stat-card>

          <app-stat-card 
            title="This Week's Spent" 
            [value]="summary().timeframeTotals.thisWeekSpent" 
            accentColor="sky"
            subtext="Current week pace">
            <span icon>📊</span>
          </app-stat-card>

          <app-stat-card 
            title="This Month's Spent" 
            [value]="summary().timeframeTotals.thisMonthSpent" 
            accentColor="amber"
            subtext="Current month billing cycle">
            <span icon>📆</span>
          </app-stat-card>

          <app-stat-card 
            title="This Year's Total" 
            [value]="summary().timeframeTotals.thisYearSpent" 
            accentColor="rose"
            subtext="Full year total">
            <span icon>📈</span>
          </app-stat-card>
        </div>
      </div>

      <!-- Multi-Account & Balance Audit Cards with Inter-Account Transfer -->
      <div class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">Multi-Account Balances</h2>
            <p class="text-xs text-slate-400">Joint accounts, Dana Darurat & e-wallets balance audit</p>
          </div>
          <app-button variant="secondary" size="sm" (btnClick)="isTransferModalOpen.set(true)">
            ⇄ Transfer Funds
          </app-button>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          @for (acc of expenseService.accounts(); track acc.id) {
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
              <div class="flex justify-between items-center text-xs text-slate-500">
                <span class="font-semibold truncate">{{ acc.name }}</span>
                <button (click)="openAdjustModal(acc)" class="text-emerald-600 hover:underline text-[10px]">Adjust</button>
              </div>
              <p class="text-lg font-bold text-slate-900 dark:text-white">{{ acc.balance | currencyIdr }}</p>
            </div>
          }
        </div>
      </div>

      <!-- Rule 3: Debt & Receivable Ledger ("Nalangin") -->
      <div class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              🤝 Debt & Receivable Ledger ("Nalangin")
            </h2>
            <p class="text-xs text-slate-400">Track payables and receivables for food & shared purchases</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (item of expenseService.nalanginList(); track item.id) {
            <div class="p-4 rounded-2xl border flex items-center justify-between"
              [class]="item.type === 'receivable' ? 'bg-sky-50/50 border-sky-200 dark:bg-sky-950/20' : 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20'">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold uppercase px-2 py-0.5 rounded-md text-white"
                    [class]="item.type === 'receivable' ? 'bg-sky-600' : 'bg-amber-600'">
                    {{ item.type === 'receivable' ? 'Receivable (Tagihan)' : 'Payable (Hutang)' }}
                  </span>
                  <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">{{ item.person }}</span>
                </div>
                <p class="text-xs text-slate-500">{{ item.notes }}</p>
                <p class="text-sm font-bold text-slate-900 dark:text-white">{{ item.amount | currencyIdr }}</p>
              </div>

              <div>
                @if (item.status === 'pending') {
                  <button (click)="expenseService.toggleNalanginStatus(item.id)" 
                    class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm">
                    Settle
                  </button>
                } @else {
                  <span class="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full">Settled</span>
                }
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Chart & Telegram Quick Widget Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <app-expense-chart 
            [categoryData]="summary().categoryBreakdown" 
            [totalAmount]="summary().totalAmount">
          </app-expense-chart>
        </div>

        <div class="p-6 rounded-2xl bg-linear-to-br from-emerald-900 to-slate-900 text-white shadow-lg flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-bold uppercase tracking-wider text-emerald-400">2-Step Interactive Bot</span>
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
            <h3 class="text-xl font-bold">Telegram Confirmation Bot</h3>
            <p class="text-xs text-slate-300 mt-2 leading-relaxed">
              Send text like <br/>
              <code class="bg-slate-800/80 px-2 py-1 rounded text-emerald-300 font-mono mt-1 inline-block">"Pecel ayam 2 total 50rb"</code><br/>
              Bot parses entry and prompts confirmation before saving to database.
            </p>
          </div>

          <div class="mt-6 pt-4 border-t border-slate-800">
            <a routerLink="/telegram-sync" class="text-xs font-semibold text-emerald-400 hover:underline flex items-center justify-between">
              Configure Webhook Settings ➔
            </a>
          </div>
        </div>
      </div>

      <!-- Data Table with Segmented & Timeframe Filters -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold text-slate-900 dark:text-white">Recent Transactions</h2>
        </div>
        <app-data-table 
          [expenses]="expenseService.expenses()"
          (editItem)="openEditModal($event)"
          (deleteItem)="onDeleteExpense($event)">
        </app-data-table>
      </div>
    </div>

    <!-- Balance Adjustment Modal -->
    @if (selectedAccountForAdjust()) {
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <h3 class="font-bold text-lg">Adjust Balance: {{ selectedAccountForAdjust()?.name }}</h3>
          
          <div class="space-y-3">
            <div>
              <label class="text-xs font-semibold uppercase text-slate-500">New Balance (Rp)</label>
              <input type="number" [value]="newAdjustBalance()" (input)="newAdjustBalance.set(+$any($event.target).value)" 
                class="w-full mt-1 p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none" />
            </div>

            <div>
              <label class="text-xs font-semibold uppercase text-slate-500">Adjustment Reason (Mandatory)</label>
              <input type="text" placeholder="e.g. Bank interest / Unlogged cash spent" [value]="adjustReason()" (input)="adjustReason.set($any($event.target).value)"
                class="w-full mt-1 p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 text-sm outline-none" />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t">
            <app-button variant="ghost" (btnClick)="selectedAccountForAdjust.set(null)">Cancel</app-button>
            <app-button variant="primary" (btnClick)="submitBalanceAdjust()">Confirm Adjustment</app-button>
          </div>
        </div>
      </div>
    }

    <!-- Inter-Account Transfer Modal -->
    @if (isTransferModalOpen()) {
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <h3 class="font-bold text-lg">⇄ Inter-Account Transfer</h3>

          <div class="space-y-3">
            <div>
              <label class="text-xs font-semibold uppercase text-slate-500">From Account</label>
              <select [value]="transferFromAcc()" (change)="transferFromAcc.set($any($event.target).value)"
                class="w-full mt-1 p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 text-sm outline-none">
                <option value="">Select Source Account</option>
                @for (acc of expenseService.accounts(); track acc.id) {
                  <option [value]="acc.id">{{ acc.name }} (Rp {{ acc.balance.toLocaleString('id-ID') }})</option>
                }
              </select>
            </div>

            <div>
              <label class="text-xs font-semibold uppercase text-slate-500">To Account</label>
              <select [value]="transferToAcc()" (change)="transferToAcc.set($any($event.target).value)"
                class="w-full mt-1 p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 text-sm outline-none">
                <option value="">Select Destination Account</option>
                @for (acc of expenseService.accounts(); track acc.id) {
                  <option [value]="acc.id">{{ acc.name }}</option>
                }
              </select>
            </div>

            <div>
              <label class="text-xs font-semibold uppercase text-slate-500">Transfer Amount (Rp)</label>
              <input type="number" [value]="transferAmount()" (input)="transferAmount.set(+$any($event.target).value)"
                class="w-full mt-1 p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none" />
            </div>

            <div>
              <label class="text-xs font-semibold uppercase text-slate-500">Notes / Reason</label>
              <input type="text" placeholder="e.g. Move to emergency fund / Top-up e-wallet" [value]="transferNotes()" (input)="transferNotes.set($any($event.target).value)"
                class="w-full mt-1 p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 text-sm outline-none" />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t">
            <app-button variant="ghost" (btnClick)="isTransferModalOpen.set(false)">Cancel</app-button>
            <app-button variant="primary" (btnClick)="submitTransfer()">Execute Transfer</app-button>
          </div>
        </div>
      </div>
    }

    <!-- Category & Utility Budget Caps Configurator Modal -->
    @if (isBudgetConfigOpen()) {
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <div class="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
            <h3 class="font-bold text-lg">⚙️ Category & Utility Budget Caps</h3>
            <button (click)="isBudgetConfigOpen.set(false)" class="text-slate-400 hover:text-slate-600">✕</button>
          </div>

          <p class="text-xs text-slate-400">Set custom monthly budget limits for Food, Electricity, Water, Entertainment & Transport to trigger automatic alerts.</p>

          <div class="space-y-3 max-h-80 overflow-y-auto pr-1">
            @for (b of expenseService.categoryBudgets(); track b.id) {
              <div class="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                <span class="text-xs font-bold text-slate-800 dark:text-slate-200">{{ b.label }}</span>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-400">Rp</span>
                  <input type="number" [value]="b.limitAmount" 
                    (change)="expenseService.updateCategoryBudget(b.id, +$any($event.target).value)" 
                    class="w-32 p-1.5 border rounded-xl bg-white dark:bg-slate-900 text-xs font-bold text-right outline-none" />
                </div>
              </div>
            }
          </div>

          <div class="flex justify-end pt-3 border-t">
            <app-button variant="primary" (btnClick)="isBudgetConfigOpen.set(false)">Done</app-button>
          </div>
        </div>
      </div>
    }

    <!-- Modal Form -->
    @if (isModalOpen()) {
      <app-expense-editor 
        [editingItem]="activeEditingItem()" 
        (closeModal)="closeModal()"
        (saveItem)="onSaveExpense($event)">
      </app-expense-editor>
    }
  `
})
export class DashboardComponent {
  isBudgetConfigOpen = signal<boolean>(false);
  expenseService = inject(ExpenseService);

  summary = computed(() => this.expenseService.calculateSummary());
  isModalOpen = signal<boolean>(false);
  activeEditingItem = signal<ExpenseItem | null>(null);

  selectedAccountForAdjust = signal<PaymentAccount | null>(null);
  newAdjustBalance = signal<number>(0);
  adjustReason = signal<string>('');

  isTransferModalOpen = signal<boolean>(false);
  transferFromAcc = signal<string>('');
  transferToAcc = signal<string>('');
  transferAmount = signal<number>(0);
  transferNotes = signal<string>('');

  openCreateModal(): void {
    this.activeEditingItem.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(item: ExpenseItem): void {
    this.activeEditingItem.set(item);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  openAdjustModal(acc: PaymentAccount): void {
    this.selectedAccountForAdjust.set(acc);
    this.newAdjustBalance.set(acc.balance);
    this.adjustReason.set('');
  }

  submitBalanceAdjust(): void {
    if (!this.selectedAccountForAdjust() || !this.adjustReason().trim()) {
      alert('Please state a reason for adjusting the balance.');
      return;
    }
    this.expenseService.adjustAccountBalance(
      this.selectedAccountForAdjust()!.id,
      this.newAdjustBalance(),
      this.adjustReason().trim()
    );
    this.selectedAccountForAdjust.set(null);
  }

  submitTransfer(): void {
    if (!this.transferFromAcc() || !this.transferToAcc() || this.transferAmount() <= 0) {
      alert('Please select both source & destination accounts and a valid transfer amount.');
      return;
    }
    if (this.transferFromAcc() === this.transferToAcc()) {
      alert('Source and destination accounts must be different.');
      return;
    }
    this.expenseService.transferFunds(
      this.transferFromAcc(),
      this.transferToAcc(),
      this.transferAmount(),
      this.transferNotes().trim()
    );
    this.isTransferModalOpen.set(false);
    this.transferAmount.set(0);
    this.transferNotes.set('');
  }

  async onSaveExpense(data: any): Promise<void> {
    if (this.activeEditingItem()) {
      await this.expenseService.updateExpense(this.activeEditingItem()!.id, data);
    } else {
      await this.expenseService.addExpense(data);
    }
    this.closeModal();
  }

  async onDeleteExpense(id: string): Promise<void> {
    if (confirm('Are you sure you want to delete this record?')) {
      await this.expenseService.deleteExpense(id);
    }
  }
}