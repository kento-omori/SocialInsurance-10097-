import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { RouteParamService } from '../../services/route-param.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  companyLoginForm: FormGroup;
  employeeLoginForm: FormGroup;
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  showRegister = false;
  registerType: 'company' | 'employee' = 'company';
  showResetPass = false;
  activeTab: 'company' | 'employee' = 'company';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private routeParamService: RouteParamService,
    private toastr: ToastrService,
    private router: Router
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

  setActiveTab(tab: 'company' | 'employee') {
    this.activeTab = tab;
  }

  async onCompanySubmit() {
    if (this.companyLoginForm.valid) {
      this.isLoading = true;
      try {
        const companyName = this.companyLoginForm.value.companyName;
        const email = this.companyLoginForm.value.email;
        const companyId = await this.userService.getCompanyIdByName(companyName);
        if (!companyId) {
          this.toastr.error('会社名が見つかりません');
          this.isLoading = false;
          return;
        }

        // 会社のメールアドレスとして登録されているか確認
        const companyProfile = await this.userService.getCompanyProfile(companyId);
        if (!companyProfile || companyProfile.companyEmail !== email) {
          this.toastr.error('このメールアドレスは会社のメールアドレスとして登録されていません');
          this.isLoading = false;
          return;
        }

        await this.authService.login(email, this.companyLoginForm.value.password);
        console.log(email,this.companyLoginForm.value.password);
        this.successMessage = 'ログイン成功';
        this.toastr.success('ログイン成功');
        this.router.navigate([`/companies/${companyId}/home`]);
      } catch (error: any) {
        this.successMessage = '';
        this.toastr.error('ログインに失敗しました: ' + error.message);
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
          this.toastr.error('会社名が見つかりません');
          this.isLoading = false;
          return;
        }

        // 会社のメールアドレスとして登録されていないか確認
        const companyProfile = await this.userService.getCompanyProfile(companyId);
        if (companyProfile && companyProfile.companyEmail === email) {
          this.toastr.error('このメールアドレスは会社のメールアドレスです。会社ログインを使用してください');
          this.isLoading = false;
          return;
        }

        const employeeId = await this.userService.getEmployeeIdByEmail(companyId, email);
        if (!employeeId) {
          this.toastr.error('従業員が見つかりません');
          this.isLoading = false;
          return;
        }

        await this.authService.login(email, password);
        this.successMessage = 'ログイン成功';
        this.toastr.success('ログイン成功');
        this.router.navigate([`/companies/${companyId}/employee-home/${employeeId}`]);
      } catch (error: any) {
        this.successMessage = '';
        this.toastr.error('ログインに失敗しました: ' + error.message);
      }
      this.isLoading = false;
    }
  }

  async resetPassword() {
    this.errorMessage = '';
    this.successMessage = '';

    let email = '';
    let loginCompanyName = '';
    
    if (this.activeTab === 'company') {
      loginCompanyName = this.companyLoginForm.get('companyName')?.value;
      email = this.companyLoginForm.get('email')?.value;
    } else {
      loginCompanyName = this.employeeLoginForm.get('companyName')?.value;
      email = this.employeeLoginForm.get('email')?.value;
    }

    if (!email) {
      this.toastr.error('パスワードリセットのためにメールアドレスを入力してください。');
      return;
    }
    email = email.trim().toLowerCase();

    if(!loginCompanyName) {
      this.toastr.error('パスワードリセットのために会社名を入力してください。');
      return;
    }

    // 1. Authに存在するか
    const exists = await this.authService.isEmailRegistered(email);
    if (!exists) {
      this.toastr.error('このメールアドレスは登録されていません。');
      return;
    }

    // 2. 会社用 or 従業員用かを判定
    let isCompany = false;
    let isEmployee = false;

    // 会社用チェック
    if (loginCompanyName) {
      const companyId = await this.userService.getCompanyIdByName(loginCompanyName);
      if (companyId) {
        const companyProfile = await this.userService.getCompanyProfile(companyId);
        if (companyProfile && companyProfile.companyEmail === email) {
          isCompany = true;
        }
      }
    }

    // 従業員用チェック
    if (loginCompanyName) {
      const companyId = await this.userService.getCompanyIdByName(loginCompanyName);
      if (companyId) {
        const employeeId = await this.userService.getEmployeeIdByEmail(companyId, email);
        if (employeeId) {
          isEmployee = true;
        }
      }
    }

    // 3. 判定結果で分岐
    if (this.activeTab === 'company' && !isCompany) {
      this.toastr.error('このメールアドレスは会社用として登録されていません。');
      return;
    }
    if (this.activeTab === 'employee' && !isEmployee) {
      this.toastr.error('このメールアドレスは従業員用として登録されていません。');
      return;
    }

    // 4. パスワードリセット送信
    try {
      await this.authService.resetPassword(email);
      this.successMessage = 'パスワードリセットのメールを送信しました。メールをご確認ください。';
      this.routeParamService.goToResetPass();
    } catch (error) {
      this.toastr.error('パスワードリセットメールの送信に失敗しました。メールアドレスを確認してください。');
    }
  }

  changeEmail() {
    this.routeParamService.goToChangeEmail();
  }
}
