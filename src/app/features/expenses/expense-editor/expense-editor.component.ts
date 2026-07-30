import { Component, input, output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpenseItem, ExpenseCategory } from '../../../core/models/expense.model';
import { InputComponent } from '../../../shared/ui/atoms/input/input.component';
import { ButtonComponent } from '../../../shared/ui/atoms/button/button.component';
import { FileUploaderComponent } from '../../../shared/ui/molecules/file-uploader/file-uploader.component';

@Component({
  selector: 'app-expense-editor',
  standalone: true,
  imports: [CommonModule, InputComponent, ButtonComponent, FileUploaderComponent],
  template: `
    <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h2 class="text-xl font-bold text-slate-900 dark:text-white">
            {{ editingItem() ? 'Edit Expense' : 'Add New Expense' }}
          </h2>
          <button (click)="closeModal.emit()" class="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div class="space-y-4">
          <app-input label="Item Title" [value]="title()" (valueChange)="title.set($event)" placeholder="e.g. Avocado 500g"></app-input>

          <div class="grid grid-cols-2 gap-4">
            <app-input label="Amount (Rp)" type="number" [value]="amount()" (valueChange)="onAmountChange($event)"></app-input>
            <app-input label="Quantity" type="number" [value]="quantity()" (valueChange)="quantity.set(+$event)"></app-input>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Category</label>
            <select 
              [value]="category()"
              (change)="category.set($any($event.target).value)"
              class="w-full py-2.5 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="food">Food & Groceries</option>
              <option value="fixed">Fixed Expense</option>
              <option value="daily">Daily Needs</option>
              <option value="vehicle">Vehicle & Transport</option>
              <option value="bills">Utility Bills</option>
              <option value="other">Other</option>
            </select>
          </div>

          <app-input label="Date" type="date" [value]="date()" (valueChange)="date.set($event)"></app-input>

          <app-file-uploader (imageUploaded)="receiptUrl.set($event)"></app-file-uploader>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <app-button variant="ghost" (btnClick)="closeModal.emit()">Cancel</app-button>
          <app-button variant="primary" (btnClick)="onSave()">Save Record</app-button>
        </div>
      </div>
    </div>
  `
})
export class ExpenseEditorComponent implements OnInit {
  editingItem = input<ExpenseItem | null>(null);
  closeModal = output<void>();
  saveItem = output<any>();

  title = signal<string>('');
  amount = signal<number>(0);
  quantity = signal<number>(1);
  category = signal<ExpenseCategory>('food');
  date = signal<string>(new Date().toISOString().split('T')[0]);
  receiptUrl = signal<string>('');

  ngOnInit(): void {
    if (this.editingItem()) {
      const item = this.editingItem()!;
      this.title.set(item.title);
      this.amount.set(item.amount);
      this.quantity.set(item.quantity);
      this.category.set(item.category);
      this.date.set(item.date);
      if (item.receiptImageUrl) this.receiptUrl.set(item.receiptImageUrl);
    }
  }

  onAmountChange(val: string): void {
    this.amount.set(parseFloat(val) || 0);
  }

  onSave(): void {
    this.saveItem.emit({
      title: this.title(),
      amount: this.amount(),
      quantity: this.quantity(),
      unitPrice: this.amount() / (this.quantity() || 1),
      category: this.category(),
      date: this.date(),
      paymentMethod: 'qris',
      createdBy: 'web_user',
      receiptImageUrl: this.receiptUrl()
    });
  }
}