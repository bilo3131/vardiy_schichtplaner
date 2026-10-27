import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DepartmentService } from '../../../core/services/department.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { Department } from '../../../core/models/employee.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';
import { DepartmentDialogComponent } from '../../../shared/dialogs/department-dialog/department-dialog.component';
import { DepartmentInfoDialogComponent } from '../../../shared/dialogs/department-info-dialog/department-info-dialog.component';

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatDialogModule,
    LoadingSpinnerComponent
  ],
  templateUrl: './department-list.component.html',
  styleUrls: ['./department-list.component.scss']
})
export class DepartmentListComponent implements OnInit {
  departments: Department[] = [];
  loading = false;
  displayedColumns = ['name', 'description', 'employee_count', 'actions'];
  showInfoBox = false;

  constructor(
    private departmentService: DepartmentService,
    private dialog: MatDialog,
    private snackbar: SnackbarService,
    private subscriptionService: SubscriptionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.loading = true;
    this.departmentService.getDepartments().subscribe({
      next: (data) => {
        this.departments = data.results || data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  openDialog(department?: Department): void {
    // Nur bei neuen Abteilungen Subscription-Limit prüfen
    if (!department && !this.subscriptionService.canAddDepartment()) {
      const limits = this.subscriptionService.getCurrentLimits();
      this.dialog.open(ConfirmDialogComponent, {
        width: '400px',
        data: {
          title: 'Abteilungs-Limit erreicht',
          message: `Sie haben das Limit von ${limits?.departments.max || 0} Abteilungen für Ihr ${limits?.tier || 'aktuelles'}-Abonnement erreicht. Bitte upgraden Sie Ihr Abonnement, um weitere Abteilungen hinzuzufügen.`,
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

    const dialogRef = this.dialog.open(DepartmentDialogComponent, {
      width: '500px',
      data: { department }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (department) {
          this.updateDepartment(department.id, result);
        } else {
          this.createDepartment(result);
        }
      }
    });
  }

  createDepartment(data: any): void {
    this.departmentService.createDepartment(data).subscribe({
      next: () => {
        this.loadDepartments();
        this.snackbar.success('Abteilung erfolgreich erstellt');
      },
      error: (error) => {
        const message = this.extractDepartmentErrorMessage(error, 'Fehler beim Erstellen der Abteilung');
        this.snackbar.error(message);
      }
    });
  }

  updateDepartment(id: number, data: any): void {
    this.departmentService.updateDepartment(id, data).subscribe({
      next: () => {
        this.loadDepartments();
        this.snackbar.success('Abteilung erfolgreich aktualisiert');
      },
      error: (error) => {
        const message = this.extractDepartmentErrorMessage(error, 'Fehler beim Aktualisieren der Abteilung');
        this.snackbar.error(message);
      }
    });
  }

  deleteDepartment(id: number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Abteilung löschen',
        message: 'Möchten Sie diese Abteilung wirklich löschen? Mitarbeiter dieser Abteilung werden keiner Abteilung zugeordnet.'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.departmentService.deleteDepartment(id).subscribe({
          next: () => {
            this.loadDepartments();
            this.snackbar.success('Abteilung erfolgreich gelöscht');
          },
          error: (error) => {
            const message = this.extractDepartmentErrorMessage(error, 'Fehler beim Löschen der Abteilung');
            this.snackbar.error(message);
          }
        });
      }
    });
  }

  openInfoDialog(department: Department): void {
    const dialogRef = this.dialog.open(DepartmentInfoDialogComponent, {
      width: '500px',
      data: { department }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'edit') {
        this.openDialog(result.department);
      }
    });
  }

  private extractDepartmentErrorMessage(error: any, defaultMessage: string): string {
    return error.error?.name?.[0] || error.error?.detail || defaultMessage;
  }

  closeInfoBox(): void {
    this.showInfoBox = false;
  }
}
