import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Employee, Qualification, VacationRequest, AbsenceRecord } from '../models';
import { getApiUrl } from '../config/api.config';
import { buildHttpParams } from '../utils/http-params.util';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private readonly API_BASE_URL = getApiUrl('SHIFTS');
  private readonly ENDPOINTS = {
    employees: `${this.API_BASE_URL}/employees/`,
    qualifications: `${this.API_BASE_URL}/qualifications/`,
    vacationRequests: `${this.API_BASE_URL}/vacation-requests/`,
    absences: `${this.API_BASE_URL}/absences/`
  } as const;

  constructor(private http: HttpClient) {}

  // ── Employees ─────────────────────────────────────────────────────────────

  /** Fetches all employees, with optional filter params. */
  getEmployees(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(this.ENDPOINTS.employees, { params: buildHttpParams(params) });
  }

  /** Creates a new employee. */
  createEmployee(employee: Partial<Employee>): Observable<Employee> {
    return this.http.post<Employee>(this.ENDPOINTS.employees, employee);
  }

  /** Partially updates an existing employee. */
  updateEmployee(id: number, employee: Partial<Employee>): Observable<Employee> {
    return this.http.patch<Employee>(`${this.ENDPOINTS.employees}${id}/`, employee);
  }

  /** Deletes an employee by ID. */
  deleteEmployee(id: number): Observable<void> {
    return this.http.delete<void>(`${this.ENDPOINTS.employees}${id}/`);
  }

  /** Triggers a password reset for the given employee. */
  resetEmployeePassword(id: number): Observable<any> {
    return this.http.post<any>(`${this.ENDPOINTS.employees}${id}/reset_password/`, {});
  }

  // ── Qualifications ────────────────────────────────────────────────────────

  /** Fetches all qualifications. */
  getQualifications(): Observable<any> {
    return this.http.get<any>(this.ENDPOINTS.qualifications);
  }

  /** Creates a new qualification. */
  createQualification(qualification: Partial<Qualification>): Observable<Qualification> {
    return this.http.post<Qualification>(this.ENDPOINTS.qualifications, qualification);
  }

  /** Partially updates an existing qualification. */
  updateQualification(id: number, qualification: Partial<Qualification>): Observable<Qualification> {
    return this.http.patch<Qualification>(`${this.ENDPOINTS.qualifications}${id}/`, qualification);
  }

  /** Deletes a qualification by ID. */
  deleteQualification(id: number): Observable<void> {
    return this.http.delete<void>(`${this.ENDPOINTS.qualifications}${id}/`);
  }

  // ── Vacation Requests ─────────────────────────────────────────────────────

  /** Fetches vacation requests, optionally filtered by status and additional params. */
  getVacationRequests(status?: string, additionalParams?: Record<string, any>): Observable<any> {
    const params = { ...additionalParams, ...(status ? { status } : {}) };
    return this.http.get<any>(this.ENDPOINTS.vacationRequests, { params: buildHttpParams(params) });
  }

  /** Creates a new vacation request. */
  createVacationRequest(request: Partial<VacationRequest>): Observable<VacationRequest> {
    return this.http.post<VacationRequest>(this.ENDPOINTS.vacationRequests, request);
  }

  /** Partially updates an existing vacation request. */
  updateVacationRequest(id: number, request: Partial<VacationRequest>): Observable<VacationRequest> {
    return this.http.patch<VacationRequest>(`${this.ENDPOINTS.vacationRequests}${id}/`, request);
  }

  /** Approves a vacation request. */
  approveVacationRequest(id: number): Observable<VacationRequest> {
    return this.http.post<VacationRequest>(`${this.ENDPOINTS.vacationRequests}${id}/approve/`, {});
  }

  /** Rejects a vacation request. */
  rejectVacationRequest(id: number): Observable<VacationRequest> {
    return this.http.post<VacationRequest>(`${this.ENDPOINTS.vacationRequests}${id}/reject/`, {});
  }

  /** Deletes a vacation request by ID. */
  deleteVacationRequest(id: number): Observable<void> {
    return this.http.delete<void>(`${this.ENDPOINTS.vacationRequests}${id}/`);
  }

  // ── Absences ──────────────────────────────────────────────────────────────

  /** Fetches all absence records, with optional filter params. */
  getAbsences(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(this.ENDPOINTS.absences, { params: buildHttpParams(params) });
  }

  /** Creates a new absence record. */
  createAbsence(absence: Partial<AbsenceRecord>): Observable<AbsenceRecord> {
    return this.http.post<AbsenceRecord>(this.ENDPOINTS.absences, absence);
  }

  /** Partially updates an existing absence record. */
  updateAbsence(id: number, absence: Partial<AbsenceRecord>): Observable<AbsenceRecord> {
    return this.http.patch<AbsenceRecord>(`${this.ENDPOINTS.absences}${id}/`, absence);
  }

  /** Deletes an absence record by ID. */
  deleteAbsence(id: number): Observable<void> {
    return this.http.delete<void>(`${this.ENDPOINTS.absences}${id}/`);
  }
}
