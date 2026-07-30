import { Injectable, signal } from '@angular/core';
import { TelegramExpensePayload } from '../models/expense.model';

@Injectable({
  providedIn: 'root'
})
export class TelegramService {
  readonly pendingTelegramExpenses = signal<TelegramExpensePayload[]>([]);

  parseTextToExpense(text: string, chatId: string = 'manual'): TelegramExpensePayload {
    const clean = text.toLowerCase();
    
    const amountMatch = clean.match(/(\d+[\d\.]*)\s*(rupiah|rb|k|idr)?/i);
    let amount = 0;
    if (amountMatch) {
      let rawNum = parseFloat(amountMatch[1].replace(/\./g, ''));
      const unit = (amountMatch[2] || '').toLowerCase();
      if (unit === 'rb' || unit === 'k') rawNum *= 1000;
      amount = rawNum;
    }

    const qtyMatch = clean.match(/(\d+)\s*(cups|pcs|pack|botol|porsi|buah|ikat)/i);
    const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

    let category: any = 'daily';
    if (/kopi|coffee|makan|nasi|ayam|ikan|buah|pisang|alpukat|beras|cabai|bawang/i.test(clean)) {
      category = 'food';
    } else if (/wifi|listrik|ipl|pulsa|kuota|laundry|gas|catridge|service/i.test(clean)) {
      category = 'fixed';
    } else if (/bensin|pertamax|parkir/i.test(clean)) {
      category = 'vehicle';
    }

    const parsedTitle = text
      .replace(/(\d+[\d\.]*)\s*(rupiah|rb|k|idr)?/gi, '')
      .replace(/(\d+)\s*(cups|pcs|pack|botol|porsi|buah|ikat)/gi, '')
      .trim() || 'Purchased Item';

    return {
      rawMessage: text,
      parsedTitle,
      parsedAmount: amount,
      parsedQuantity: quantity,
      parsedCategory: category,
      date: new Date().toISOString().split('T')[0],
      chatId,
      confidenceScore: amount > 0 ? 0.95 : 0.4
    };
  }
}