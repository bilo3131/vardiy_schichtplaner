import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { ShiftService } from '../../../core/services/shift.service';
import { ShiftType } from '../../../core/models';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ShiftTypeDialogComponent } from '../../../shared/dialogs/shift-type-dialog/shift-type-dialog.component';
import { ShiftTypeDetailDialogComponent } from '../../../shared/dialogs/shift-type-detail-dialog/shift-type-detail-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';
import { DashboardFilterService } from '../../../core/services/dashboard-filter.service';
import { SnackbarService } from '../../../core/services/snackbar.service';

@Component({
  selector: 'app-shift-type-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    LoadingSpinnerComponent
  ],
  templateUrl: './shift-type-list.component.html',
  styleUrls: ['./shift-type-list.component.scss']
})
export class ShiftTypeListComponent implements OnInit {
  shiftTypes: ShiftType[] = [];
  loading = false;
  displayedColumns = ['name', 'department', 'start_time', 'end_time', 'color', 'break_duration', 'night_hours', 'actions'];
  showInfoBox = false;

  constructor(
    private shiftService: ShiftService,
    private dialog: MatDialog,
    private snackbar: SnackbarService,
    private dashboardFilterService: DashboardFilterService
  ) {}

  ngOnInit(): void {
    this.loadShiftTypes();
    
    // Reagiere auf Abteilungsänderungen
    this.dashboardFilterService.selectedDepartmentId$.subscribe(() => {
      this.loadShiftTypes();
    });
  }

  loadShiftTypes(): void {
    this.loading = true;
    const params = this.buildQueryParams();
    
    this.shiftService.getShiftTypes(params).subscribe({
      next: (response) => {
        const types = response.results || response;
        this.shiftTypes = types;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading shift types:', error);
        this.loading = false;
      }
    });
  }

  private buildQueryParams(): any {
    const departmentId = this.dashboardFilterService.selectedDepartmentId$.value;
    const params: any = {};
    
    if (departmentId && departmentId !== 'all') {
      params.department = departmentId;
    }
    
    return params;
  }

  openShiftTypeDialog(shiftType?: ShiftType): void {
    const dialogRef = this.dialog.open(ShiftTypeDialogComponent, {
      width: '500px',
      data: { shiftType }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (shiftType) {
          this.updateShiftType(shiftType.id, result);
        } else {
          this.createShiftType(result);
        }
      }
    });
  }

  createShiftType(shiftTypeData: Partial<ShiftType>): void {
    this.shiftService.createShiftType(shiftTypeData).subscribe({
      next: () => {
        this.loadShiftTypes();
        this.snackbar.success('Schichttyp erfolgreich erstellt');
      },
      error: (error) => {
        const errorMessage = this.extractShiftTypeErrorMessage(error, 'Fehler beim Erstellen des Schichttyps');
        this.snackbar.error(errorMessage);
      }
    });
  }

  updateShiftType(id: number, shiftTypeData: Partial<ShiftType>): void {
    this.shiftService.updateShiftType(id, shiftTypeData).subscribe({
      next: () => {
        this.loadShiftTypes();
        this.snackbar.success('Schichttyp erfolgreich aktualisiert');
      },
      error: (error) => {
        const errorMessage = this.extractShiftTypeErrorMessage(error, 'Fehler beim Aktualisieren des Schichttyps');
        this.snackbar.error(errorMessage);
      }
    });
  }

  deleteShiftType(id: number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Schichttyp löschen',
        message: 'Möchten Sie diesen Schichttyp wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
        confirmText: 'Löschen',
        cancelText: 'Abbrechen'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.shiftService.deleteShiftType(id).subscribe({
          next: () => {
            this.loadShiftTypes();
            this.snackbar.success('Schichttyp erfolgreich gelöscht');
          },
          error: (error) => {
            const errorMessage = this.extractShiftTypeErrorMessage(error, 'Fehler beim Löschen des Schichttyps');
            this.snackbar.error(errorMessage);
          }
        });
      }
    });
  }

  openShiftTypeDetailDialog(shiftType: ShiftType): void {
    const dialogRef = this.dialog.open(ShiftTypeDetailDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: { shiftType }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.action === 'edit') {
        this.openShiftTypeDialog(result.shiftType);
      }
    });
  }

  formatNightHours(hours: number): string {
    if (!hours || hours === 0) return '0:00 h';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')} h`;
  }

  private extractShiftTypeErrorMessage(error: any, defaultMessage: string): string {
    if (error.status === 500 && error.error?.detail?.includes('UNIQUE constraint')) {
      return 'Ein Schichttyp mit diesem Namen existiert bereits';
    }
    
    if (error.error?.name) {
      return error.error.name[0];
    }
    
    return error.error?.detail || defaultMessage;
  }

  closeInfoBox(): void {
    this.showInfoBox = false;
  }
}
