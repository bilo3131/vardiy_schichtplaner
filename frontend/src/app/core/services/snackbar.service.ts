import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UI_CONSTANTS } from '../constants/ui.constants';

/** Shows the app's standard success, error and info snackbars. */
@Injectable({
  providedIn: 'root'
})
export class SnackbarService {
  constructor(private snackBar: MatSnackBar) {}

  /** Shows a success message. */
  success(message: string): void {
    this.snackBar.open(message, 'Schließen', {
      duration: UI_CONSTANTS.SNACKBAR.DURATION,
      panelClass: ['success-snackbar']
    });
  }

  /** Shows an error message, which stays visible longer than other messages. */
  error(message: string): void {
    this.snackBar.open(message, 'Schließen', {
      duration: UI_CONSTANTS.SNACKBAR.ERROR_DURATION,
      panelClass: ['error-snackbar']
    });
  }

  /** Shows a neutral informational message. */
  info(message: string): void {
    this.snackBar.open(message, 'Schließen', {
      duration: UI_CONSTANTS.SNACKBAR.DURATION
    });
  }
}
