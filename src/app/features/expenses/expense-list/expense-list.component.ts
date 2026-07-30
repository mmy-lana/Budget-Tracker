import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpenseService } from '../../../core/services/expense.service';
import { ExcelService } from '../../../core/services/excel.service';
import { DataTableComponent } from '../../../shared/ui/organisms/data-table/data-table.component';
import { ButtonComponent } from '../../../shared/ui/atoms/button/button.component';
import { ExpenseEditorComponent } from '../expense-editor/expense-editor.component';

@Component({
  selector: 'app-expense-list',
  standalone: true,
  imports: [CommonModule, DataTableComponent, ButtonComponent, ExpenseEditorComponent],
  template: `
    <div class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Expense Records</h1>
          <p class="text-xs text-slate-500 mt-1">Full transaction log with receipt attachments</p>
        </div>

        <div class="flex gap-3">
          <app-button variant="outline" (btnClick)="exportExcel()">
            📥 Export Excel
          </app-button>
          <app-button variant="primary" (btnClick)="isModalOpen.set(true)">
            + New Record
          </app-button>
        </div>
      </div>

      <app-data-table
        [expenses]="expenseService.expenses()"
        (editItem)="activeEditItem.set($event); isModalOpen.set(true)"
        (deleteItem)="onDelete($event)">
      </app-data-table>

      @if (isModalOpen()) {
        <app-expense-editor
          [editingItem]="activeEditItem()"
          (closeModal)="isModalOpen.set(false)"
          (saveItem)="onSave($event)">
        </app-expense-editor>
      }
    </div>
  `
})
export class ExpenseListComponent {
  expenseService = inject(ExpenseService);
  excelService = inject(ExcelService);

  isModalOpen = signal<boolean>(false);
  activeEditItem = signal<any>(null);

  async onSave(data: any): Promise<void> {
    if (this.activeEditItem()) {
      await this.expenseService.updateExpense(this.activeEditItem().id, data);
    } else {
      await this.expenseService.addExpense(data);
    }
    this.isModalOpen.set(false);
  }

  async onDelete(id: string): Promise<void> {
    if (confirm('Delete this record?')) {
      await this.expenseService.deleteExpense(id);
    }
  }

  exportExcel(): void {
    this.excelService.exportExpensesToExcel(this.expenseService.expenses());
  }
}