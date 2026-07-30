import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ExpenseService } from '../../core/services/expense.service';
import { StatCardComponent } from '../../shared/ui/molecules/stat-card/stat-card.component';
import { ExpenseChartComponent } from '../../shared/ui/organisms/expense-chart/expense-chart.component';
import { DataTableComponent } from '../../shared/ui/organisms/data-table/data-table.component';
import { ButtonComponent } from '../../shared/ui/atoms/button/button.component';
import { ExpenseItem } from '../../core/models/expense.model';
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
          <p class="text-xs text-slate-500 mt-1">Real-time expenditure tracking & cashflow analysis</p>
        </div>
        
        <div class="flex items-center gap-3">
          <app-button variant="primary" (btnClick)="openCreateModal()">
            + Add Expense
          </app-button>
        </div>
      </div>

      <!-- Quick Stat Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <app-stat-card 
          title="Total Spent" 
          [value]="summary().totalAmount" 
          accentColor="emerald"
          subtext="Current billing cycle">
          <span icon>💸</span>
        </app-stat-card>

        <app-stat-card 
          title="Monthly Buffer" 
          [value]="2135700" 
          accentColor="sky"
          trendText="Safe"
          trendType="up"
          subtext="Net remaining liquid cash">
          <span icon>🛡️</span>
        </app-stat-card>

        <app-stat-card 
          title="Food Budget" 
          [value]="summary().categoryBreakdown.food" 
          accentColor="amber"
          subtext="High nutrition target">
          <span icon>🥗</span>
        </app-stat-card>

        <app-stat-card 
          title="Fixed Expenses" 
          [value]="5107150" 
          accentColor="rose"
          subtext="Utilities, rent & commitments">
          <span icon>⚡</span>
        </app-stat-card>
      </div>

      <!-- Chart & Telegram Quick Widget Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <app-expense-chart 
            [categoryData]="summary().categoryBreakdown" 
            [totalAmount]="summary().totalAmount">
          </app-expense-chart>
        </div>

        <div class="p-6 rounded-2xl bg-gradient-to-br from-emerald-900 to-slate-900 text-white shadow-lg flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-bold uppercase tracking-wider text-emerald-400">Bot Automation</span>
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
            <h3 class="text-xl font-bold">Telegram Receipt Bot</h3>
            <p class="text-xs text-slate-300 mt-2 leading-relaxed">
              Snap a receipt or send messages like <br/>
              <code class="bg-slate-800/80 px-2 py-1 rounded text-emerald-300 font-mono mt-1 inline-block">"buy coffee 25000 for 2 cups"</code>
              directly to automatically log expenses.
            </p>
          </div>

          <div class="mt-6 pt-4 border-t border-slate-800">
            <a routerLink="/telegram-sync" class="text-xs font-semibold text-emerald-400 hover:underline flex items-center justify-between">
              Configure Webhook Settings ➔
            </a>
          </div>
        </div>
      </div>

      <!-- Data Table -->
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
  expenseService = inject(ExpenseService);

  summary = computed(() => this.expenseService.calculateSummary());
  isModalOpen = signal<boolean>(false);
  activeEditingItem = signal<ExpenseItem | null>(null);

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