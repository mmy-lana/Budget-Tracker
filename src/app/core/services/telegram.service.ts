import { Injectable, signal } from '@angular/core';
import { TelegramExpensePayload, ExpenseCategory, ExpenseSubCategory } from '../models/expense.model';

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
    const unitPrice = quantity > 0 ? amount / quantity : amount;

    let category: ExpenseCategory = 'food';
    let subCategory: ExpenseSubCategory = 'resto_dining';

    if (/kopi|coffee|cafe/i.test(clean)) {
      category = 'food';
      subCategory = 'cafe_coffee';
    } else if (/beras|minyak|sayur|buah|daging|telur/i.test(clean)) {
      category = 'food';
      subCategory = 'ingredients';
    } else if (/wifi|listrik|ipl|pulsa|kuota|laundry|gas/i.test(clean)) {
      category = 'fixed';
      subCategory = 'fixed';
    } else if (/bensin|pertamax|parkir/i.test(clean)) {
      category = 'vehicle';
      subCategory = 'vehicle';
    } else if (/bioskop|nonton|movie|film|events/i.test(clean)) {
      category = 'entertainment';
      subCategory = 'movies_theater';
    }

    const parsedTitle = text
      .replace(/(\d+[\d\.]*)\s*(rupiah|rb|k|idr)?/gi, '')
      .replace(/(\d+)\s*(cups|pcs|pack|botol|porsi|buah|ikat)/gi, '')
      .trim() || 'Purchased Item';

    return {
      pendingId: `ID${Math.floor(100 + Math.random() * 900)}`,
      rawMessage: text,
      parsedTitle,
      parsedAmount: amount,
      parsedQuantity: quantity,
      parsedUnitPrice: unitPrice,
      parsedCategory: category,
      parsedSubCategory: subCategory,
      date: new Date().toISOString().split('T')[0],
      chatId,
      confidenceScore: amount > 0 ? 0.95 : 0.4
    };
  }
}