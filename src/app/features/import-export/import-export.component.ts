import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExcelService } from '../../core/services/excel.service';
import { ExpenseService } from '../../core/services/expense.service';
import { ButtonComponent } from '../../shared/ui/atoms/button/button.component';

@Component({
  selector: 'app-import-export',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  template: `
    <div class="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white">Excel Sync & Database Backup</h1>
        <p class="text-xs text-slate-500 mt-1">Spreadsheet template import/export and full JSON database migration</p>
      </div>

      <div class="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <!-- Excel Section -->
        <div class="space-y-4">
          <div class="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
            <h3 class="font-bold text-base">📊 Excel Spreadsheet Import</h3>
            <app-button variant="outline" size="sm" (btnClick)="excelService.downloadExcelTemplate()">
              📥 Download Template (.xlsx)
            </app-button>
          </div>

          <div class="border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 rounded-2xl text-center space-y-3">
            <p class="text-xs text-slate-400">Upload pre-formatted .xlsx or .csv spreadsheet</p>
            <input #fileInput type="file" accept=".xlsx, .csv" class="hidden" (change)="onFileSelected($event)" />
            <app-button variant="secondary" (btnClick)="fileInput.click()">
              Select Excel File
            </app-button>
          </div>
        </div>

        @if (statusMessage()) {
          <div class="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold">
            {{ statusMessage() }}
          </div>
        }

        <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h4 class="text-sm font-bold">Export Expenses to Excel</h4>
            <p class="text-xs text-slate-400">Download active records to Excel</p>
          </div>
          <app-button variant="primary" (btnClick)="onExport()">
            Download .XLSX
          </app-button>
        </div>

        <!-- Full JSON Backup & Restore Section -->
        <div class="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div>
            <h3 class="font-bold text-base">🛡️ Full Database Backup & Restore (JSON)</h3>
            <p class="text-xs text-slate-400">Migrate or restore all expenses, accounts, nalangin ledgers & savings targets</p>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl">
            <app-button variant="secondary" (btnClick)="expenseService.exportFullBackupJson()">
              📥 Export Full DB (JSON)
            </app-button>

            <div class="flex items-center gap-3">
              <input #jsonInput type="file" accept=".json" class="hidden" (change)="onJsonBackupSelected($event)" />
              <app-button variant="outline" (btnClick)="jsonInput.click()">
                📤 Restore DB from JSON
              </app-button>

              <app-button variant="danger" (btnClick)="confirmReset()">
                🗑️ Reset Expenses to Rp 0
              </app-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ImportExportComponent {
  excelService = inject(ExcelService);
  expenseService = inject(ExpenseService);

  statusMessage = signal<string>('');

  async onFileSelected(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      try {
        const imported = await this.excelService.importExpensesFromExcel(input.files[0]);
        const merged = this.excelService.mergeExpenseLists(this.expenseService.expenses(), imported);

        for (const item of merged) {
          await this.expenseService.addExpense(item);
        }

        this.statusMessage.set(`Successfully imported and merged ${imported.length} expense items!`);
      } catch (err: any) {
        this.statusMessage.set('Error parsing Excel file structure.');
      }
    }
  }

  async onJsonBackupSelected(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = async (event: any) => {
        try {
          const parsedObj = JSON.parse(event.target.result);
          await this.expenseService.restoreFullBackupJson(parsedObj);
          this.statusMessage.set('Successfully restored database backup from JSON file!');
        } catch (err) {
          this.statusMessage.set('Failed to restore backup: Invalid JSON structure.');
        }
      };
      reader.readAsText(input.files[0]);
    }
  }

  onExport(): void {
    this.excelService.exportExpensesToExcel(this.expenseService.expenses());
  }

  async confirmReset(): Promise<void> {
    if (confirm('Are you sure you want to delete ALL expense records and start fresh from Rp 0?')) {
      await this.expenseService.resetAllExpensesToZero();
      this.statusMessage.set('All expenses have been reset to 0. You can now manually input new records.');
    }
  }
}