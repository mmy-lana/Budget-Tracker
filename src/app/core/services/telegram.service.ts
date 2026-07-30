import { Injectable, signal } from '@angular/core';
import { TelegramExpensePayload, ExpenseCategory, ExpenseSubCategory } from '../models/expense.model';

@Injectable({
  providedIn: 'root'
})
export class TelegramService {
  readonly pendingTelegramExpenses = signal<TelegramExpensePayload[]>([]);

  parseTextToExpense(text: string, chatId: string = 'manual'): TelegramExpensePayload {
    const clean = text.toLowerCase();

    let totalAmount = 0;
    let quantity = 1;
    let amountMatchString = '';

    const explicitAmountRegex = /(?:rp\.?\s*|total\s*)?(\d+[\d\.]*)\s*(rb|k|ribu|rupiah|idr)\b|(?:rp\.?\s*|total\s+)(\d+[\d\.]*)\b/gi;
    let amtMatch = explicitAmountRegex.exec(clean);

    if (amtMatch) {
      amountMatchString = amtMatch[0];
      let numStr = (amtMatch[1] || amtMatch[3]).replace(/\./g, '');
      let num = parseFloat(numStr);
      let unit = (amtMatch[2] || '').toLowerCase();
      if (unit === 'rb' || unit === 'k' || unit === 'ribu') num *= 1000;
      totalAmount = num;
    } else {
      const numRegex = /(\d+[\d\.]*)/g;
      const numMatches = [];
      let m;
      while ((m = numRegex.exec(clean)) !== null) {
        const val = parseFloat(m[1].replace(/\./g, ''));
        numMatches.push({ raw: m[0], val, index: m.index });
      }
      if (numMatches.length > 0) {
        const candidate = numMatches.reduce((max, cur) => cur.val > max.val ? cur : max, numMatches[0]);
        if (candidate.val >= 100) {
          totalAmount = candidate.val;
          amountMatchString = candidate.raw;
        }
      }
    }

    let remainingText = text;
    if (amountMatchString) {
      remainingText = remainingText.replace(new RegExp(amountMatchString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), ' ');
    }

    const qtyRegex = /(?:for|qty|jumlah|x)?\s*(\d+)\s*(pcs|pack|botol|porsi|buah|ikat|cups|x)?/i;
    const qtyMatch = remainingText.match(qtyRegex);
    let qtyMatchString = '';

    if (qtyMatch) {
      const qVal = parseInt(qtyMatch[1], 10);
      if (qVal > 0 && qVal < 100 && qVal !== totalAmount) {
        quantity = qVal;
        qtyMatchString = qtyMatch[0];
      }
    }

    if (qtyMatchString) {
      remainingText = remainingText.replace(qtyMatchString, ' ');
    }

    const unitPrice = quantity > 0 ? totalAmount / quantity : totalAmount;

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

    const parsedTitle = remainingText
      .replace(/^(buy|beli)\s+/i, '')
      .replace(/total/gi, '')
      .replace(/[,;:\-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Purchased Item';

    return {
      pendingId: `ID${Math.floor(100 + Math.random() * 900)}`,
      rawMessage: text,
      parsedTitle,
      parsedAmount: totalAmount,
      parsedQuantity: quantity,
      parsedUnitPrice: unitPrice,
      parsedCategory: category,
      parsedSubCategory: subCategory,
      date: new Date().toISOString().split('T')[0],
      chatId,
      confidenceScore: totalAmount > 0 ? 0.95 : 0.4
    };
  }
}