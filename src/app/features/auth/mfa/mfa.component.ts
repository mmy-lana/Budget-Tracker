import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { InputComponent } from '../../../shared/ui/atoms/input/input.component';
import { ButtonComponent } from '../../../shared/ui/atoms/button/button.component';

@Component({
  selector: 'app-mfa',
  standalone: true,
  imports: [CommonModule, InputComponent, ButtonComponent],
  template: `
    <div class="min-h-[80vh] flex items-center justify-center">
      <div class="w-full max-w-md p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl text-center">
        <div class="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-bold text-2xl mx-auto flex items-center justify-center mb-4">
          🔐
        </div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Two-Factor Authentication</h1>
        <p class="text-xs text-slate-500 mt-1 mb-6">Enter the 6-digit code from your Google Authenticator app</p>

        @if (errorMessage()) {
          <div class="p-3 mb-4 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium">
            {{ errorMessage() }}
          </div>
        }

        <div class="space-y-4">
          <app-input
            label="Verification Code"
            placeholder="123456"
            [value]="code()"
            (valueChange)="code.set($event)" />

          <app-button 
            variant="primary" 
            [fullWidth]="true" 
            [loading]="loading()"
            (btnClick)="onVerify()">
            Verify Code
          </app-button>
        </div>
      </div>
    </div>
  `
})
export class MfaComponent {
  authService = inject(AuthService);
  router = inject(Router);

  code = signal<string>('');
  loading = signal<boolean>(false);
  errorMessage = signal<string>('');

  async onVerify(): Promise<void> {
    if (this.code().length !== 6) {
      this.errorMessage.set('Enter a valid 6-digit code.');
      return;
    }
    this.loading.set(true);
    try {
      await this.authService.verifyMfaChallenge(this.code());
      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.errorMessage.set('Invalid authentication code.');
    } finally {
      this.loading.set(false);
    }
  }
}