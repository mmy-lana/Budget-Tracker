import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpenseService } from '../../core/services/expense.service';
import { NalanginLedger } from '../../core/models/expense.model';
import { CurrencyIdrPipe } from '../../shared/pipes/currency-idr.pipe';
import { ButtonComponent } from '../../shared/ui/atoms/button/button.component';
import { BadgeComponent } from '../../shared/ui/atoms/badge/badge.component';

export type NalanginTab = 'all' | 'receivable' | 'payable';
export type StatusFilter = 'all' | 'pending' | 'settled';

@Component({
  selector: 'app-nalangin',
  standalone: true,
  imports: [CommonModule, CurrencyIdrPipe, ButtonComponent, BadgeComponent],
  template: `
    <div class="space-y-8 max-w-6xl mx-auto">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <span>🤝</span> Nalangin Ledger
          </h1>
          <p class="text-xs text-slate-500 mt-1">Track shared purchases, receivables (tagihan), and payables (hutang)</p>
        </div>

        <app-button variant="primary" (btnClick)="openAddModal()">
          + Add Entry
        </app-button>
      </div>

      <!-- Quick Summary Matrix -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div class="p-5 rounded-3xl bg-sky-500 text-white shadow-md space-y-1">
          <span class="text-xs uppercase font-bold tracking-wider text-sky-100">Total Receivables (Tagihan)</span>
          <h3 class="text-2xl font-black">{{ totalReceivables() | currencyIdr }}</h3>
          <p class="text-[11px] text-sky-100">Money owed to you by others</p>
        </div>

        <div class="p-5 rounded-3xl bg-amber-500 text-white shadow-md space-y-1">
          <span class="text-xs uppercase font-bold tracking-wider text-amber-100">Total Payables (Hutang)</span>
          <h3 class="text-2xl font-black">{{ totalPayables() | currencyIdr }}</h3>
          <p class="text-[11px] text-amber-100">Money you owe to others</p>
        </div>

        <div class="p-5 rounded-3xl bg-emerald-700 text-white shadow-md space-y-1">
          <span class="text-xs uppercase font-bold tracking-wider text-emerald-200">Net Settled Balance</span>
          <h3 class="text-2xl font-black">{{ totalReceivables() - totalPayables() | currencyIdr }}</h3>
          <p class="text-[11px] text-emerald-200">Pending net position</p>
        </div>
      </div>

      <!-- Filters & Content List -->
      <div class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <!-- Type Tabs -->
          <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl">
            <button 
              (click)="activeTab.set('all')"
              [class]="activeTab() === 'all' ? 'bg-white dark:bg-slate-900 font-bold shadow-sm' : 'text-slate-500'"
              class="px-3.5 py-1.5 text-xs rounded-xl transition-all">
              All
            </button>
            <button 
              (click)="activeTab.set('receivable')"
              [class]="activeTab() === 'receivable' ? 'bg-sky-600 text-white font-bold shadow-sm' : 'text-slate-500'"
              class="px-3.5 py-1.5 text-xs rounded-xl transition-all">
              Tagihan (Receivables)
            </button>
            <button 
              (click)="activeTab.set('payable')"
              [class]="activeTab() === 'payable' ? 'bg-amber-600 text-white font-bold shadow-sm' : 'text-slate-500'"
              class="px-3.5 py-1.5 text-xs rounded-xl transition-all">
              Hutang (Payables)
            </button>
          </div>

          <!-- Status Filter -->
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-slate-400">Status:</span>
            <select 
              [value]="activeStatus()" 
              (change)="activeStatus.set($any($event.target).value)"
              class="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none">
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="settled">Settled</option>
            </select>
          </div>
        </div>

        <!-- Ledger Items Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-xs font-semibold tracking-wider">
              <tr>
                <th class="px-4 py-3">Date</th>
                <th class="px-4 py-3">Type</th>
                <th class="px-4 py-3">Person</th>
                <th class="px-4 py-3">Notes</th>
                <th class="px-4 py-3 text-right">Amount</th>
                <th class="px-4 py-3 text-center">Status</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (item of filteredList(); track item.id) {
                <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-3.5 text-xs text-slate-400">{{ item.date || (item.createdAt | date:'yyyy-MM-dd') }}</td>
                  <td class="px-4 py-3.5">
                    <span class="text-[11px] font-bold uppercase px-2 py-0.5 rounded-md text-white"
                      [class]="item.type === 'receivable' ? 'bg-sky-600' : 'bg-amber-600'">
                      {{ item.type === 'receivable' ? 'Tagihan' : 'Hutang' }}
                    </span>
                  </td>
                  <td class="px-4 py-3.5 font-bold text-slate-900 dark:text-white">{{ item.person }}</td>
                  <td class="px-4 py-3.5 text-xs text-slate-500">{{ item.notes || '-' }}</td>
                  <td class="px-4 py-3.5 text-right font-bold text-slate-900 dark:text-white">
                    {{ item.amount | currencyIdr }}
                  </td>
                  <td class="px-4 py-3.5 text-center">
                    <button (click)="expenseService.toggleNalanginStatus(item.id)" class="cursor-pointer">
                      <app-badge [variant]="item.status === 'settled' ? 'emerald' : 'warning'" [showDot]="item.status === 'pending'">
                        {{ item.status === 'settled' ? 'Settled' : 'Pending' }}
                      </app-badge>
                    </button>
                  </td>
                  <td class="px-4 py-3.5 text-right space-x-2">
                    <button (click)="openEditModal(item)" class="text-xs text-slate-500 hover:text-emerald-600 font-semibold">Edit</button>
                    <button (click)="expenseService.deleteNalanginItem(item.id)" class="text-xs text-rose-500 hover:text-rose-700 font-semibold">Delete</button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="px-4 py-8 text-center text-slate-400 text-xs">
                    No nalangin entries found.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    @if (isModalOpen()) {
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
          <h2 class="text-lg font-bold">{{ editingItem() ? 'Edit Nalangin Entry' : 'Add Nalangin Entry' }}</h2>

          <div class="space-y-3">
            <div>
              <label class="text-xs font-semibold uppercase text-slate-500">Person Name</label>
              <input type="text" [value]="formPerson()" (input)="formPerson.set($any($event.target).value)" placeholder="e.g. Budi / Siti"
                class="w-full mt-1 p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 text-sm outline-none" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-semibold uppercase text-slate-500">Ledger Type</label>
                <select [value]="formType()" (change)="formType.set($any($event.target).value)"
                  class="w-full mt-1 p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 text-sm outline-none">
                  <option value="receivable">Tagihan (Receivable)</option>
                  <option value="payable">Hutang (Payable)</option>
                </select>
              </div>

              <div>
                <label class="text-xs font-semibold uppercase text-slate-500">Amount (Rp)</label>
                <input type="number" [value]="formAmount()" (input)="formAmount.set(+$any($event.target).value)"
                  class="w-full mt-1 p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none" />
              </div>
            </div>

            <div>
              <label class="text-xs font-semibold uppercase text-slate-500">Date</label>
              <input type="date" [value]="formDate()" (input)="formDate.set($any($event.target).value)"
                class="w-full mt-1 p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 text-sm outline-none" />
            </div>

            <div>
              <label class="text-xs font-semibold uppercase text-slate-500">Notes / Description</label>
              <input type="text" [value]="formNotes()" (input)="formNotes.set($any($event.target).value)" placeholder="e.g. Lunch GoFood payment"
                class="w-full mt-1 p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 text-sm outline-none" />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <app-button variant="ghost" (btnClick)="isModalOpen.set(false)">Cancel</app-button>
            <app-button variant="primary" (btnClick)="saveEntry()">Save Entry</app-button>
          </div>
        </div>
      </div>
    }
  `
})
export class NalanginComponent {
  expenseService = inject(ExpenseService);

  activeTab = signal<NalanginTab>('all');
  activeStatus = signal<StatusFilter>('all');

  isModalOpen = signal<boolean>(false);
  editingItem = signal<NalanginLedger | null>(null);

  formPerson = signal<string>('');
  formType = signal<'receivable' | 'payable'>('receivable');
  formAmount = signal<number>(0);
  formDate = signal<string>(new Date().toISOString().split('T')[0]);
  formNotes = signal<string>('');

  totalReceivables = computed(() => 
    this.expenseService.nalanginList()
      .filter(i => i.type === 'receivable' && i.status === 'pending')
      .reduce((acc, curr) => acc + curr.amount, 0)
  );

  totalPayables = computed(() => 
    this.expenseService.nalanginList()
      .filter(i => i.type === 'payable' && i.status === 'pending')
      .reduce((acc, curr) => acc + curr.amount, 0)
  );

  filteredList = computed(() => {
    const tab = this.activeTab();
    const st = this.activeStatus();

    return this.expenseService.nalanginList().filter(item => {
      const matchType = tab === 'all' || item.type === tab;
      const matchStatus = st === 'all' || item.status === st;
      return matchType && matchStatus;
    });
  });

  openAddModal(): void {
    this.editingItem.set(null);
    this.formPerson.set('');
    this.formType.set('receivable');
    this.formAmount.set(0);
    this.formDate.set(new Date().toISOString().split('T')[0]);
    this.formNotes.set('');
    this.isModalOpen.set(true);
  }

  openEditModal(item: NalanginLedger): void {
    this.editingItem.set(item);
    this.formPerson.set(item.person);
    this.formType.set(item.type);
    this.formAmount.set(item.amount);
    this.formDate.set(item.date || new Date().toISOString().split('T')[0]);
    this.formNotes.set(item.notes);
    this.isModalOpen.set(true);
  }

  async saveEntry(): Promise<void> {
    if (!this.formPerson().trim() || this.formAmount() <= 0) {
      alert('Please fill in person name and valid amount.');
      return;
    }

    if (this.editingItem()) {
      await this.expenseService.updateNalanginItem(this.editingItem()!.id, {
        person: this.formPerson().trim(),
        type: this.formType(),
        amount: this.formAmount(),
        date: this.formDate(),
        notes: this.formNotes().trim()
      });
    } else {
      await this.expenseService.addNalanginItem({
        person: this.formPerson().trim(),
        type: this.formType(),
        amount: this.formAmount(),
        date: this.formDate(),
        notes: this.formNotes().trim(),
        status: 'pending'
      });
    }

    this.isModalOpen.set(false);
  }
}