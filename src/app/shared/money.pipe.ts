import { Pipe, PipeTransform } from '@angular/core';

const fmt = new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', currencyDisplay: 'narrowSymbol' });

@Pipe({ name: 'money', standalone: true })
export class MoneyPipe implements PipeTransform {
  transform(v: number | string | null | undefined): string { return fmt.format(Number(v ?? 0)); }
}
