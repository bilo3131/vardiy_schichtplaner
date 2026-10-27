import { Injectable, Provider } from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, NativeDateAdapter } from '@angular/material/core';

const DE_DATE_FORMATS = {
  parse: {
    dateInput: 'DD.MM.YYYY',
  },
  display: {
    dateInput: 'DD.MM.YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

/** Native date adapter that renders datepicker input values as DD.MM.YYYY. */
@Injectable()
class GermanDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: Object): string {
    if (displayFormat === 'DD.MM.YYYY') {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${day}.${month}.${date.getFullYear()}`;
    }
    return date.toDateString();
  }
}

/** Component providers that make Material datepickers use the German DD.MM.YYYY format. */
export const GERMAN_DATE_PROVIDERS: Provider[] = [
  { provide: MAT_DATE_LOCALE, useValue: 'de-DE' },
  { provide: DateAdapter, useClass: GermanDateAdapter },
  { provide: MAT_DATE_FORMATS, useValue: DE_DATE_FORMATS }
];
