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
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white">Excel Data Sync</h1>
        <p class="text-xs text-slate-500 mt-1">Import and export spreadsheet records with smart duplicate merging</p>
      </div>

      <div class="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div class="border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 rounded-2xl text-center space-y-3">
          <div class="text-4xl">📊</div>
          <h3 class="text-base font-bold text-slate-900 dark:text-white">Upload Spreadsheet (.xlsx / .csv)</h3>
          <p class="text-xs text-slate-400">Automatically merges records matching same date and title</p>
          
          <input #fileInput type="file" accept=".xlsx, .csv" class="hidden" (change)="onFileSelected($event)" />
          
          <app-button variant="secondary" (btnClick)="fileInput.click()">
            Select Excel File
          </app-button>
        </div>

        @if (statusMessage()) {
          <div class="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold">
            {{ statusMessage() }}
          </div>
        }

        <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h4 class="text-sm font-bold">Export Current Database</h4>
            <p class="text-xs text-slate-400">Download active Firestore records to Excel</p>
          </div>
          <app-button variant="primary" (btnClick)="onExport()">
            Download .XLSX
          </app-button>
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
        this.statusMessage.set('Error parsing Excel file format.');
      }
    }
  }

  onExport(): void {
    this.excelService.exportExpensesToExcel(this.expenseService.expenses());
  }
}