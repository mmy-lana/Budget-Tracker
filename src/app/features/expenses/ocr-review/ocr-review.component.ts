import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TelegramExpensePayload } from '../../../core/models/expense.model';
import { ButtonComponent } from '../../../shared/ui/atoms/button/button.component';
import { CurrencyIdrPipe } from '../../../shared/pipes/currency-idr.pipe';

@Component({
  selector: 'app-ocr-review',
  standalone: true,
  imports: [CommonModule, ButtonComponent, CurrencyIdrPipe],
  template: `
    @if (payload()) {
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
          <h2 class="text-lg font-bold">Review AI Detected Expense</h2>

          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-slate-500">Detected Item:</span>
              <span class="font-bold">{{ payload()?.parsedTitle }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Amount:</span>
              <span class="font-bold text-emerald-600">{{ payload()?.parsedAmount | currencyIdr }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Quantity:</span>
              <span class="font-bold">{{ payload()?.parsedQuantity }}</span>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-3">
            <app-button variant="ghost" (btnClick)="reject.emit()">Discard</app-button>
            <app-button variant="primary" (btnClick)="approve.emit(payload()!)">Confirm & Save</app-button>
          </div>
        </div>
      </div>
    }
  `
})
export class OcrReviewComponent {
  payload = input<TelegramExpensePayload | null>(null);
  approve = output<TelegramExpensePayload>();
  reject = output<void>();
}