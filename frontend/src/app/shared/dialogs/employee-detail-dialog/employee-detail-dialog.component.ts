import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { Employee, EmploymentType, UserRole } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { EMPLOYMENT_TYPE_LABELS, MANAGER_ROLES, ROLE_LABELS } from '../../../core/constants/roles.constants';

@Component({
  selector: 'app-employee-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSlideToggleModule
  ],
  templateUrl: './employee-detail-dialog.component.html',
  styleUrls: ['./employee-detail-dialog.component.scss']
})
export class EmployeeDetailDialogComponent {
  originalIsActive: boolean;

  constructor(
    @Inject(MAT_DIALOG_DATA) public employee: Employee,
    private dialogRef: MatDialogRef<EmployeeDetailDialogComponent>,
    private authService: AuthService
  ) {
    this.originalIsActive = employee.is_active;
  }

  canViewStatus(): boolean {
    const user = this.authService.currentUserValue;
    return !!user && MANAGER_ROLES.includes(user.role);
  }

  canEditStatus(): boolean {
    const user = this.authService.currentUserValue;
    return user?.role === 'admin';
  }

  canEdit(): boolean {
    const user = this.authService.currentUserValue;
    if (!user) return false;
    
    // Admin und HR können alle bearbeiten
    if (user.role === 'admin' || user.role === 'hr') return true;
    
    // Abteilungsleiter können Teamleiter, Gruppenleiter und Mitarbeiter bearbeiten
    if (user.role === 'department_manager') {
      const employeeRole = this.employee.user_details?.role;
      return employeeRole === 'team_leader' || 
             employeeRole === 'group_leader' || 
             employeeRole === 'employee';
    }
    
    // Jeder kann sein eigenes Profil bearbeiten
    if (user.employee_profile?.id === this.employee.id) return true;
    
    return false;
  }

  getEmploymentTypeLabel(type: string): string {
    return EMPLOYMENT_TYPE_LABELS[type as EmploymentType] || type;
  }

  getRoleLabel(role: string): string {
    return ROLE_LABELS[role as UserRole] || role;
  }

  onStatusChange(): void {
    // Statusänderung wird über den Return-Wert weitergegeben
  }

  onEdit(): void {
    this.dialogRef.close({ action: 'edit', employee: this.employee });
  }

  ngOnDestroy(): void {
    // Wenn Status geändert wurde, beim Schließen zurückgeben
    if (this.originalIsActive !== this.employee.is_active) {
      this.dialogRef.close({ action: 'updateStatus', employee: this.employee });
    }
  }
}
