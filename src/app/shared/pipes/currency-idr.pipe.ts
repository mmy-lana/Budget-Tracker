import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyIdr',
  standalone: true
})
export class CurrencyIdrPipe implements PipeTransform {
  transform(
    value: number | string | null | undefined, 
    compact: boolean = false, 
    showSymbol: boolean = true
  ): string {
    if (value === null || value === undefined || isNaN(Number(value))) {
      return showSymbol ? 'Rp0' : '0';
    }

    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    const prefix = showSymbol ? 'Rp' : '';

    if (compact) {
      if (Math.abs(numericValue) >= 1_000_000_000) {
        return `${prefix}${(numericValue / 1_000_000_000).toFixed(1)}B`;
      }
      if (Math.abs(numericValue) >= 1_000_000) {
        return `${prefix}${(numericValue / 1_000_000).toFixed(1)}M`;
      }
      if (Math.abs(numericValue) >= 1_000) {
        return `${prefix}${(numericValue / 1_000).toFixed(0)}k`;
      }
    }

    const formatted = new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: 0
    }).format(numericValue);

    return `${prefix}${formatted}`;
  }
}