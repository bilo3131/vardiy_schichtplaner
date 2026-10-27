import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { EmployeeService } from '../../../core/services/employee.service';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardFilterService } from '../../../core/services/dashboard-filter.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { Employee, EmploymentType, UserRole } from '../../../core/models';
import { ADMIN_ROLES, EMPLOYMENT_TYPE_LABELS, ROLE_LABELS, canManageRole } from '../../../core/constants/roles.constants';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { EmployeeDialogComponent } from '../../../shared/dialogs/employee-dialog/employee-dialog.component';
import { EmployeeDetailDialogComponent } from '../../../shared/dialogs/employee-detail-dialog/employee-detail-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';
import { PasswordResetDialogComponent } from '../../../shared/dialogs/password-reset-dialog/password-reset-dialog.component';
import { UI_CONSTANTS } from '../../../core/constants/ui.constants';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    LoadingSpinnerComponent,
    MatTooltipModule
  ],
  templateUrl: './employee-list.component.html',
  styleUrls: ['./employee-list.component.scss']
})
export class EmployeeListComponent implements OnInit {
  employees: Employee[] = [];
  loading = false;
  displayedColumns = ['name', 'department', 'employment_type', 'hours', 'role', 'status', 'actions'];
  
  filters = {
    employmentType: '',
    isActive: ''
  };

  showInfoBox = false;

  constructor(
    private employeeService: EmployeeService,
    private dialog: MatDialog,
    private snackbar: SnackbarService,
    public authService: AuthService,
    private dashboardFilterService: DashboardFilterService,
    private subscriptionService: SubscriptionService,
    private router: Router
  ) {}

  /** Admin and HR may add, delete and reset the passwords of employees. */
  private isAdminOrHr(): boolean {
    const user = this.authService.currentUserValue;
    return !!user && ADMIN_ROLES.includes(user.role);
  }

  canAddEmployee(): boolean {
    return this.isAdminOrHr();
  }

  canEditEmployee(employee: Employee): boolean {
    const user = this.authService.currentUserValue;
    if (!user) return false;
    if (user.employee_profile?.id === employee.id) return true;
    return canManageRole(user.role, employee.user_details?.role);
  }

  canDeleteEmployee(): boolean {
    return this.isAdminOrHr();
  }

  canResetPassword(): boolean {
    return this.isAdminOrHr();
  }

  ngOnInit(): void {
    this.dashboardFilterService.selectedDepartmentId$.subscribe(() => {
      this.loadEmployees();
    });
  }

  loadEmployees(): void {
    this.loading = true;
    const params = this.buildQueryParams();

    this.employeeService.getEmployees(params).subscribe({
      next: (data) => {
        this.employees = data.results || data;
        // Sortiere Mitarbeiter nach vollständigem Namen
        this.employees.sort((a, b) => {
          const nameA = a.full_name.toLowerCase();
          const nameB = b.full_name.toLowerCase();
          return nameA.localeCompare(nameB, 'de');
        });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private buildQueryParams(): any {
    const params: any = {};
    
    if (this.filters.employmentType) {
      params.employment_type = this.filters.employmentType;
    }
    if (this.filters.isActive) {
      params.is_active = this.filters.isActive;
    }
    
    const departmentId = this.dashboardFilterService.getDepartmentFilter();
    if (departmentId !== 'all') {
      params.department = departmentId;
    }

    return params;
  }

  getEmploymentTypeLabel(type: string): string {
    return EMPLOYMENT_TYPE_LABELS[type as EmploymentType] || type;
  }

  getRoleLabel(role: string): string {
    return ROLE_LABELS[role as UserRole] || role;
  }

  openDetailDialog(employee: Employee): void {
    const dialogRef = this.dialog.open(EmployeeDetailDialogComponent, {
      width: '700px',
      data: employee
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.action === 'edit') {
        this.openDialog(result.employee);
      } else if (result?.action === 'updateStatus') {
        this.updateEmployeeStatus(result.employee);
      }
    });
  }

  private updateEmployeeStatus(employee: Employee): void {
    this.employeeService.updateEmployee(employee.id, { 
      is_active: employee.is_active 
    }).subscribe({
      next: () => {
        this.loadEmployees();
        this.snackbar.success('Status erfolgreich aktualisiert');
      },
      error: (error) => {
        console.error('Error updating status:', error);
        this.snackbar.error('Fehler beim Aktualisieren des Status');
      }
    });
  }

  openDialog(employee?: Employee): void {
    // Nur bei neuen Mitarbeitern Subscription-Limit prüfen
    if (!employee && !this.subscriptionService.canAddEmployee()) {
      const limits = this.subscriptionService.getCurrentLimits();
      this.dialog.open(ConfirmDialogComponent, {
        width: '400px',
        data: {
          title: 'Mitarbeiter-Limit erreicht',
          message: `Sie haben das Limit von ${limits?.employees.max || 0} Mitarbeitern für Ihr ${limits?.tier || 'aktuelles'}-Abonnement erreicht. Bitte upgraden Sie Ihr Abonnement, um weitere Mitarbeiter hinzuzufügen.`,
          confirmText: 'Abonnement upgraden',
          cancelText: 'Abbrechen'
        }
      }).afterClosed().subscribe(result => {
        if (result) {
          this.router.navigate(['/subscription']);
        }
      });
      return;
    }

    const dialogRef = this.dialog.open(EmployeeDialogComponent, {
      width: '600px',
      data: { employee }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (employee) {
          this.updateEmployee(employee.id!, result);
        } else {
          this.createEmployee(result);
        }
      }
    });
  }

  createEmployee(data: any): void {
    this.employeeService.createEmployee(data).subscribe({
      next: () => {
        this.loadEmployees();
        this.snackbar.success('Mitarbeiter erfolgreich erstellt');
      },
      error: (error) => {
        console.error('Error creating employee:', error);
        this.snackbar.error(this.extractErrorMessage(error, 'Fehler beim Erstellen des Mitarbeiters'));
      }
    });
  }

  updateEmployee(id: number, data: any): void {
    this.employeeService.updateEmployee(id, data).subscribe({
      next: () => {
        this.loadEmployees();
        this.snackbar.success('Mitarbeiter erfolgreich aktualisiert');
      },
      error: (error) => {
        console.error('Error updating employee:', error);
        this.snackbar.error('Fehler beim Aktualisieren des Mitarbeiters');
      }
    });
  }

  deleteEmployee(id: number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Mitarbeiter löschen',
        message: 'Möchten Sie diesen Mitarbeiter wirklich löschen?'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.performDelete(id);
      }
    });
  }

  resetEmployeePassword(employee: Employee): void {
    const fullName = `${employee.user_details.first_name} ${employee.user_details.last_name}`;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Passwort zurücksetzen',
        message: `Möchten Sie das Passwort für ${fullName} zurücksetzen? Ein neues zufälliges Passwort wird generiert.`
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.performPasswordReset(employee.id);
      }
    });
  }

  private performPasswordReset(id: number): void {
    this.employeeService.resetEmployeePassword(id).subscribe({
      next: (response) => {
        this.dialog.open(PasswordResetDialogComponent, {
          width: UI_CONSTANTS.DIALOG.WIDTH_MD,
          data: response
        });
        this.snackbar.success('Passwort erfolgreich zurückgesetzt');
      },
      error: (error) => {
        console.error('Error resetting password:', error);
        this.snackbar.error(error.error?.error || 'Fehler beim Zurücksetzen des Passworts');
      }
    });
  }

  private performDelete(id: number): void {
    this.employeeService.deleteEmployee(id).subscribe({
      next: () => {
        this.loadEmployees();
        this.snackbar.success('Mitarbeiter erfolgreich gelöscht');
      },
      error: (error) => {
        console.error('Error deleting employee:', error);
        this.snackbar.error('Fehler beim Löschen des Mitarbeiters');
      }
    });
  }

  private extractErrorMessage(error: any, defaultMessage: string): string {
    return error.error?.email?.[0] || error.error?.detail || defaultMessage;
  }

  closeInfoBox(): void {
    this.showInfoBox = false;
  }
}
