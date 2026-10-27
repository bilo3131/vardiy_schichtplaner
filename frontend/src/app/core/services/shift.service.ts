import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Shift, ShiftType, ComplianceCheck } from '../models';
import { getApiUrl } from '../config/api.config';
import { buildHttpParams } from '../utils/http-params.util';

@Injectable({
  providedIn: 'root'
})
export class ShiftService {
  private readonly API_BASE_URL = getApiUrl('SHIFTS');
  private readonly ENDPOINTS = {
    shiftTypes: `${this.API_BASE_URL}/shift-types/`,
    shifts: `${this.API_BASE_URL}/shifts/`
  } as const;

  constructor(private http: HttpClient) {}

  // ── Shift Types ───────────────────────────────────────────────────────────

  /** Fetches all shift types, with optional filter params. */
  getShiftTypes(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(this.ENDPOINTS.shiftTypes, { params: buildHttpParams(params) });
  }

  /** Creates a new shift type. */
  createShiftType(shiftType: Partial<ShiftType>): Observable<ShiftType> {
    return this.http.post<ShiftType>(this.ENDPOINTS.shiftTypes, shiftType);
  }

  /** Partially updates an existing shift type. */
  updateShiftType(id: number, shiftType: Partial<ShiftType>): Observable<ShiftType> {
    return this.http.patch<ShiftType>(`${this.ENDPOINTS.shiftTypes}${id}/`, shiftType);
  }

  /** Deletes a shift type by ID. */
  deleteShiftType(id: number): Observable<void> {
    return this.http.delete<void>(`${this.ENDPOINTS.shiftTypes}${id}/`);
  }

  // ── Shifts ────────────────────────────────────────────────────────────────

  /** Fetches all shifts, with optional filter params (e.g. week, department). */
  getShifts(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(this.ENDPOINTS.shifts, { params: buildHttpParams(params) });
  }

  /** Creates a new shift. */
  createShift(shift: Partial<Shift>): Observable<Shift> {
    return this.http.post<Shift>(this.ENDPOINTS.shifts, shift);
  }

  /** Partially updates an existing shift. */
  updateShift(id: number, shift: Partial<Shift>): Observable<Shift> {
    return this.http.patch<Shift>(`${this.ENDPOINTS.shifts}${id}/`, shift);
  }

  /** Deletes a shift by ID. */
  deleteShift(id: number): Observable<void> {
    return this.http.delete<void>(`${this.ENDPOINTS.shifts}${id}/`);
  }

  /** Publishes all shifts within the given date range. */
  publishWeek(startDate: string, endDate: string): Observable<any> {
    return this.http.post(`${this.ENDPOINTS.shifts}publish_week/`, {
      start_date: startDate,
      end_date: endDate
    });
  }

  /** Checks whether assigning an employee to a shift on a date violates compliance rules. */
  validateCompliance(employeeId: number, date: string): Observable<ComplianceCheck> {
    return this.http.get<ComplianceCheck>(`${this.ENDPOINTS.shifts}validate_compliance/`, {
      params: { employee: employeeId.toString(), date }
    });
  }
}
