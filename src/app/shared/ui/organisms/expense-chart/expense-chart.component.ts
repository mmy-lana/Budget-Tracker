import { Component, input, effect, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { ExpenseCategory } from '../../../../core/models/expense.model';
import { CurrencyIdrPipe } from '../../../pipes/currency-idr.pipe';

Chart.register(...registerables);

@Component({
  selector: 'app-expense-chart',
  standalone: true,
  imports: [CommonModule, CurrencyIdrPipe],
  template: `
    <div class="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-lg font-bold text-slate-900 dark:text-white">Expense Distribution</h2>
          <p class="text-xs text-slate-400">Category breakdown for current cycle</p>
        </div>
        <span class="text-sm font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-xl">
          {{ totalAmount() | currencyIdr }}
        </span>
      </div>

      <div class="relative w-full h-64 flex items-center justify-center">
        <canvas #chartCanvas></canvas>
      </div>
    </div>
  `
})
export class ExpenseChartComponent implements AfterViewInit {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  categoryData = input.required<Record<ExpenseCategory, number>>();
  totalAmount = input<number>(0);

  private chart: Chart | null = null;

  constructor() {
    effect(() => {
      const data = this.categoryData();
      if (this.chart && data) {
        this.updateChart(data);
      }
    });
  }

  ngAfterViewInit(): void {
    this.initChart();
  }

  private initChart(): void {
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Fixed', 'Food', 'Daily', 'Savings', 'Bills', 'Vehicle', 'Other'],
        datasets: [{
          data: [0, 0, 0, 0, 0, 0, 0],
          backgroundColor: [
            '#059669', // Emerald 600
            '#10b981', // Emerald 500
            '#34d399', // Emerald 400
            '#0284c7', // Sky 600
            '#f59e0b', // Amber 500
            '#6366f1', // Indigo 500
            '#94a3b8'  // Slate 400
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: { family: 'Inter', size: 12 }
            }
          }
        },
        cutout: '70%'
      }
    });

    if (this.categoryData()) {
      this.updateChart(this.categoryData());
    }
  }

  private updateChart(data: Record<ExpenseCategory, number>): void {
    if (!this.chart) return;
    const values = [
      data.fixed || 0,
      data.food || 0,
      data.daily || 0,
      data.savings || 0,
      data.bills || 0,
      data.vehicle || 0,
      data.other || 0
    ];
    this.chart.data.datasets[0].data = values;
    this.chart.update();
  }
}