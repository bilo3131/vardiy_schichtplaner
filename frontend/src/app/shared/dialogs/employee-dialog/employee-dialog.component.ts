import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { Employee, EmploymentType, Qualification, Department, UserRole } from '../../../core/models';
import { EmployeeService } from '../../../core/services/employee.service';
import { DepartmentService } from '../../../core/services/department.service';
import { AuthService } from '../../../core/services/auth.service';
import { DateUtilsService } from '../../../core/services/date-utils.service';
import {
  ADMIN_ROLES, EMPLOYMENT_TYPE_LABELS, ROLE_LABELS, SUPERVISOR_ROLES, canManageRole
} from '../../../core/constants/roles.constants';

@Component({
  selector: 'app-employee-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule
  ],
  templateUrl: './employee-dialog.component.html',
  styleUrls: ['./employee-dialog.component.scss']
})
export class EmployeeDialogComponent {
  employeeForm: FormGroup;
  qualifications: Qualification[] = [];
  filteredQualifications: Qualification[] = [];
  departments: Department[] = [];

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private departmentService: DepartmentService,
    private authService: AuthService,
    private dateUtils: DateUtilsService,
    public dialogRef: MatDialogRef<EmployeeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { employee?: Employee }
  ) {
    const user = data.employee?.user_details || {};
    const today = new Date().toISOString().split('T')[0];
    
    // Überstunden in Stunden und Minuten aufteilen
    const overtimeHours = data.employee?.overtime_hours || 0;
    const overtimeH = Math.floor(Math.abs(overtimeHours));
    const overtimeMin = Math.round((Math.abs(overtimeHours) - overtimeH) * 60);
    const overtimeSign = overtimeHours < 0 ? -1 : 1;
    
    this.employeeForm = this.fb.group({
      first_name: [user.first_name || '', Validators.required],
      last_name: [user.last_name || '', Validators.required],
      email: [user.email || '', [Validators.required, Validators.email]],
      department: [data.employee?.department || null, Validators.required],
      employment_type: [data.employee?.employment_type || '', Validators.required],
      role: [data.employee?.user_details?.role || 'employee'],
      min_hours_per_week: [data.employee?.min_hours_per_week || 0, Validators.min(0)],
      max_hours_per_week: [data.employee?.max_hours_per_week || 40, [Validators.min(0), Validators.max(60)]],
      qualifications: [data.employee?.qualifications || []],
      hire_date: [data.employee?.hire_date || today, Validators.required],
      overtime_hours_h: [overtimeH * overtimeSign],
      overtime_hours_min: [overtimeMin, [Validators.min(0), Validators.max(59)]],
      notes: [data.employee?.notes || '']
    });
    
    this.loadQualifications();
    this.loadDepartments();
    
    // Reagiere auf Abteilungsänderungen und filtere Qualifikationen
    this.employeeForm.get('department')?.valueChanges.subscribe(departmentId => {
      this.filterQualifications(departmentId);
      // Entferne Qualifikationen, die nicht mehr zur neuen Abteilung gehören
      const currentQuals = this.employeeForm.get('qualifications')?.value || [];
      const validQuals = currentQuals.filter((qualId: number) => 
        this.filteredQualifications.some(q => q.id === qualId)
      );
      this.employeeForm.get('qualifications')?.setValue(validQuals);
    });
    
    // Without full edit rights only qualifications and notes stay editable
    if (!this.canEditEmployee()) {
      Object.keys(this.employeeForm.controls).forEach(key => {
        this.employeeForm.get(key)?.disable();
      });
    } else if (!this.canEditAllFields()) {
      Object.keys(this.employeeForm.controls).forEach(key => {
        if (key !== 'qualifications' && key !== 'notes') {
          this.employeeForm.get(key)?.disable();
        }
      });
    }
  }
  
  loadQualifications(): void {
    this.employeeService.getQualifications().subscribe({
      next: (data) => {
        this.qualifications = data.results || data;
        // Initiale Filterung basierend auf aktueller Abteilung
        const departmentId = this.employeeForm.get('department')?.value;
        this.filterQualifications(departmentId);
      },
      error: (error) => {
        console.error('Error loading qualifications:', error);
      }
    });
  }

  filterQualifications(departmentId: number | null): void {
    if (!departmentId) {
      // Zeige Qualifikationen ohne Abteilung oder alle
      this.filteredQualifications = this.qualifications.filter(q => !q.department);
    } else {
      // Zeige nur Qualifikationen der ausgewählten Abteilung und solche ohne Abteilung
      this.filteredQualifications = this.qualifications.filter(q => 
        q.department === departmentId || !q.department
      );
    }
  }

  loadDepartments(): void {
    this.departmentService.getDepartments().subscribe({
      next: (data) => {
        this.departments = data.results || data;
      },
      error: (error) => {
        console.error('Error loading departments:', error);
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.employeeForm.valid) {
      // Verwende getRawValue() um auch disabled Felder zu erhalten
      const formValue = { ...this.employeeForm.getRawValue() };
      
      // Konvertiere Überstunden von Stunden+Minuten zu Dezimalstunden
      const overtimeH = formValue.overtime_hours_h || 0;
      const overtimeMin = formValue.overtime_hours_min || 0;
      // Runde auf 2 Dezimalstellen für Backend (DecimalField mit decimal_places=2)
      formValue.overtime_hours = Math.round((overtimeH + (overtimeMin / 60)) * 100) / 100;
      
      // Entferne die temporären Felder
      delete formValue.overtime_hours_h;
      delete formValue.overtime_hours_min;
      
      // Konvertiere Datum zu YYYY-MM-DD Format
      if (formValue.hire_date instanceof Date) {
        formValue.hire_date = this.dateUtils.formatDateISO(formValue.hire_date);
      }
      
      this.dialogRef.close(formValue);
    }
  }

  canEditEmployee(): boolean {
    if (!this.authService.currentUserValue) return false;
    return !this.data.employee || this.canManageEmployee();
  }

  canEditQualifications(): boolean {
    return !!this.data.employee && this.canManageEmployee();
  }

  /** Admin and HR may edit every field, including role and working hours. */
  canEditAllFields(): boolean {
    const user = this.authService.currentUserValue;
    return !!user && ADMIN_ROLES.includes(user.role);
  }

  /** Supervisors may edit their own profile; otherwise the employee's role decides. */
  private canManageEmployee(): boolean {
    const user = this.authService.currentUserValue;
    const employee = this.data.employee;
    if (!user || !employee) return false;

    const employeeRole = employee.user_details?.role || 'employee';
    const isOwnProfile = user.employee_profile?.id === employee.id;
    return canManageRole(user.role, employeeRole) || (isOwnProfile && SUPERVISOR_ROLES.includes(user.role));
  }

  // Hilfsmethoden für die Anzeige
  getQualificationNames(): string {
    const selectedIds = this.employeeForm.get('qualifications')?.value || [];
    return this.qualifications
      .filter(q => selectedIds.includes(q.id))
      .map(q => q.name)
      .join(', ') || 'Keine';
  }

  getDepartmentName(): string {
    const deptId = this.employeeForm.get('department')?.value;
    return this.departments.find(d => d.id === deptId)?.name || 'Keine Abteilung';
  }

  getEmploymentTypeName(): string {
    const type = this.employeeForm.get('employment_type')?.value;
    return EMPLOYMENT_TYPE_LABELS[type as EmploymentType] || type;
  }

  getRoleName(): string {
    const role = this.employeeForm.get('role')?.value;
    return ROLE_LABELS[role as UserRole] || role;
  }
}
