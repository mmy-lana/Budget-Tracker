import { Injectable } from '@angular/core';
import * as XLSX from '@e965/xlsx';
import { ExpenseItem } from '../models/expense.model';

@Injectable({
  providedIn: 'root'
})
export class ExcelService {

  downloadExcelTemplate(): void {
    const templateData = [
      {
        Date: '2026-07-30 14:30',
        Title: 'Sample Groceries Purchase',
        Category: 'food',
        SubCategory: 'ingredients',
        Quantity: 2,
        UnitPrice: 25000,
        TotalAmount: 50000,
        PaymentMethod: 'qris',
        StoreName: 'Supermarket Jaya'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Expense_Template');
    XLSX.writeFile(workbook, 'budget_tracker_template.xlsx');
  }

  exportExpensesToExcel(expenses: ExpenseItem[], filename: string = 'expenses-report.xlsx'): void {
    // 1. Group Summary By Month & Calculate Remaining Buffer
    const monthlyGroups = new Map<string, number>();
    for (const exp of expenses) {
      const ym = exp.date?.substring(0, 7) || 'Unknown';
      monthlyGroups.set(ym, (monthlyGroups.get(ym) || 0) + exp.amount);
    }

    const totalIncomeEstimate = 15750000;
    const summaryRows = Array.from(monthlyGroups.entries()).map(([month, spent]) => ({
      Month: month,
      TotalIncome: totalIncomeEstimate,
      TotalSpent: spent,
      MoneyLeftBuffer: totalIncomeEstimate - spent,
      Status: (totalIncomeEstimate - spent) >= 0 ? 'Surplus (Safe)' : 'Deficit (Over Budget)'
    }));

    // 2. All Expenses Log Sheet
    const breakdownRows = expenses.map(e => ({
      Month: e.date?.substring(0, 7) || '',
      Date: e.date,
      Title: e.title,
      Category: e.category.toUpperCase(),
      SubCategory: e.subCategory || e.category,
      Quantity: e.quantity,
      UnitPrice: e.unitPrice,
      TotalAmount: e.amount,
      PaymentMethod: e.paymentMethod,
      StoreName: e.storeName || '-',
      CreatedBy: e.createdBy
    }));

    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Monthly Summary & Buffer');

    const breakdownSheet = XLSX.utils.json_to_sheet(breakdownRows);
    XLSX.utils.book_append_sheet(workbook, breakdownSheet, 'Expenses Breakdown');

    XLSX.writeFile(workbook, filename);
  }

  async importExpensesFromExcel(file: File): Promise<Omit<ExpenseItem, 'id' | 'createdAt' | 'updatedAt'>[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet);

          const parsedItems: Omit<ExpenseItem, 'id' | 'createdAt' | 'updatedAt'>[] = rawRows.map(row => ({
            date: row.Date || row.date || new Date().toISOString().split('T')[0],
            title: row.Title || row.title || row.Item || 'Imported Expense',
            category: (row.Category || row.category || 'daily').toLowerCase(),
            quantity: Number(row.Quantity || row.qty || 1),
            unitPrice: Number(row.UnitPrice || row.price || row.Amount || 0),
            amount: Number(row.TotalAmount || row.amount || 0),
            paymentMethod: (row.PaymentMethod || 'qris').toLowerCase(),
            createdBy: 'excel_import'
          }));

          resolve(parsedItems);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }

  mergeExpenseLists(
    existingExpenses: ExpenseItem[], 
    importedExpenses: Omit<ExpenseItem, 'id' | 'createdAt' | 'updatedAt'>[]
  ): Omit<ExpenseItem, 'id' | 'createdAt' | 'updatedAt'>[] {
    const uniqueMap = new Map<string, Omit<ExpenseItem, 'id' | 'createdAt' | 'updatedAt'>>();

    for (const exp of existingExpenses) {
      const key = `${exp.date}_${exp.title.toLowerCase()}_${exp.amount}`;
      uniqueMap.set(key, exp);
    }

    for (const imp of importedExpenses) {
      const key = `${imp.date}_${imp.title.toLowerCase()}_${imp.amount}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, imp);
      }
    }

    return Array.from(uniqueMap.values());
  }
}