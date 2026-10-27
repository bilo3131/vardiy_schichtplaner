import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { DemoLoginDialogComponent } from './demo-login-dialog.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatDividerModule,
    LoadingSpinnerComponent
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  loading = false;
  hidePassword = true;
  private previousTheme: boolean = false;
  currentYear = new Date().getFullYear();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackbar: SnackbarService,
    private themeService: ThemeService,
    private dialog: MatDialog
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Speichere aktuelles Theme und erzwinge Light Mode für Login
    this.previousTheme = this.themeService.isDarkMode;
    if (this.previousTheme) {
      this.themeService.setTheme(false);
    }
  }

  ngOnDestroy(): void {
    // Theme wird beim Login automatisch vom AuthService gesetzt
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.loading = true;
      this.authService.login(this.loginForm.value).subscribe({
        next: (response) => {
          this.loading = false;
          this.snackbar.success(response.message || 'Login erfolgreich!');
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          this.loading = false;
          const message = error.error?.error || 'Login fehlgeschlagen. Bitte überprüfen Sie Ihre Anmeldedaten.';
          this.snackbar.error(message);
        }
      });
    }
  }

  openDemoDialog(): void {
    const dialogRef = this.dialog.open(DemoLoginDialogComponent, {
      width: '400px',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(email => {
      if (email) {
        this.loading = true;
        this.authService.demoLogin(email).subscribe({
          next: () => {
            this.loading = false;
            this.snackbar.success('Demo gestartet! Daten werden täglich um 2 Uhr zurückgesetzt.');
            this.router.navigate(['/dashboard']);
          },
          error: (error) => {
            this.loading = false;
            const message = error.error?.error || 'Demo-Login fehlgeschlagen. Bitte versuche es erneut.';
            this.snackbar.error(message);
          }
        });
      }
    });
  }
}
