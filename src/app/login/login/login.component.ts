import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RegisterComponent } from '../register/register.component';
import { AuthService } from '../../services/auth.service';
import { ResetPassComponent } from '../reset-pass/reset-pass.component';
import { UserService } from '../../services/user.service';
import { NavigationService } from '../../services/navigation.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RegisterComponent, ResetPassComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  companyLoginForm: FormGroup;
  employeeLoginForm: FormGroup;
  isLoading = false;
  successMessage = '';
  showRegister = false;
  registerType: 'company' | 'employee' = 'company';
  showResetPass = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private userService: UserService,
    private navigationService: NavigationService
  ) {
    this.companyLoginForm = this.fb.group({
      companyName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(20),
        Validators.pattern('^[a-zA-Z0-9]+$')
      ]]
    });

    this.employeeLoginForm = this.fb.group({
      companyName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(20),
        Validators.pattern('^[a-zA-Z0-9]+$')
      ]]
    });
  }

  async onCompanySubmit() {
    if (this.companyLoginForm.valid) {
      this.isLoading = true;
      try {
        const companyName = this.companyLoginForm.value.companyName;
        const companyId = await this.userService.getCompanyIdByName(companyName);
        if (!companyId) {
          alert('会社名が見つかりません');
          this.isLoading = false;
          return;
        }

        await this.authService.login(
          this.companyLoginForm.value.email,
          this.companyLoginForm.value.password
        );
        this.successMessage = 'ログイン成功';
        this.navigationService.goToCompanyHome(companyId);
      } catch (error: any) {
        this.successMessage = '';
        alert('ログインに失敗しました: ' + error.message);
      }
      this.isLoading = false;
    }
  }

  async onEmployeeSubmit() {
    if (this.employeeLoginForm.valid) {
      this.isLoading = true;
      try {
        const companyName = this.employeeLoginForm.value.companyName;
        const email = this.employeeLoginForm.value.email;
        const password = this.employeeLoginForm.value.password;

        const companyId = await this.userService.getCompanyIdByName(companyName);
        if (!companyId) {
          alert('会社名が見つかりません');
          this.isLoading = false;
          return;
        }

        const employeeId = await this.userService.getEmployeeIdByEmail(companyId, email);
        if (!employeeId) {
          alert('従業員が見つかりません');
          this.isLoading = false;
          return;
        }

        await this.authService.login(email, password);
        this.successMessage = 'ログイン成功';
        this.navigationService.goToEmployeeHome(companyId, employeeId);
      } catch (error: any) {
        this.successMessage = '';
        alert('ログインに失敗しました: ' + error.message);
      }
      this.isLoading = false;
    }
  }

  openRegister(type: 'company' | 'employee') {
    this.registerType = type;
    this.showRegister = true;
  }

  async closeRegister() {
    try {
      await this.navigationService.goToVerifyEmail();
      this.showRegister = false;
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }

  openResetPass() {
    this.showResetPass = true;
  }

  closeResetPass() {
    this.showResetPass = false;
  }
}
