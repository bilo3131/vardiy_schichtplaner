import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getApiUrl } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class HolidayService {
  private readonly holidaysUrl = `${getApiUrl('SHIFTS')}/holidays/`;

  constructor(private http: HttpClient) {}

  /** Fetches all holidays, optionally filtered by date range. */
  getHolidays(startDate?: string, endDate?: string): Observable<any> {
    const params: Record<string, string> = {};
    if (startDate) params['start_date'] = startDate;
    if (endDate) params['end_date'] = endDate;
    return this.http.get<any>(this.holidaysUrl, { params });
  }
}
