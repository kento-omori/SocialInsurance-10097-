import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../../services/user.service';
import { RouteParamService } from '../../services/route-param.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {
  registerType: 'company' | 'employee' = 'company';
  registerForm: FormGroup;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private userService: UserService,
    private route: ActivatedRoute,
    private routeParamService: RouteParamService
  ) {
    this.registerForm = this.createForm('company');
  }

  ngOnInit() {
    // クエリパラメータからregisterTypeを取得
    const type = this.routeParamService.getQueryParam(this.route, 'type');
    if (type === 'employee' || type === 'company') {
      this.registerType = type;
      this.registerForm = this.createForm(type);
    }
  }

  createForm(type: 'company' | 'employee'): FormGroup {
    const passwordValidators = [
      Validators.required,
      Validators.minLength(6),
      Validators.maxLength(20),
      Validators.pattern('^[a-zA-Z0-9]+$'),
      Validators.pattern(/^(?!\s+$).+/)
    ];
    if (type === 'employee') {
      return this.fb.group({
        companyName: ['', [Validators.required, Validators.pattern(/^(?!\s+$).+/)]],
        employeeId: ['', [Validators.required, Validators.pattern(/^(?!\s+$).+/)]],
        lastName: ['', [Validators.required, Validators.pattern('^[ぁ-んァ-ン一-龥々ー]+$')]],
        firstName: ['', [Validators.required, Validators.pattern('^[ぁ-んァ-ン一-龥々ー]+$')]],
        email: ['', [Validators.required, Validators.email, Validators.pattern(/^(?!\s+$).+/)]],
        password: ['', passwordValidators],
        confirmPassword: ['', Validators.required]
      }, { validators: this.passwordsMatchValidator });
    } else {
      return this.fb.group({
        companyName: ['', [Validators.required, Validators.pattern(/^(?!\s+$).+/)]],
        email: ['', [Validators.required, Validators.email, Validators.pattern(/^(?!\s+$).+/)]],
        password: ['', passwordValidators],
        confirmPassword: ['', Validators.required]
      }, { validators: this.passwordsMatchValidator });
    }
  }

  passwordsMatchValidator(group: AbstractControl) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordsMismatch: true };
  }

  // 新規登録ボタン
  async onSubmit() {
    if (this.registerForm.invalid) {
      if (this.registerForm.errors?.['passwordsMismatch']) {
        this.error = 'パスワードと再確認用パスワードが一致しません。';
      } else {
        this.error = '入力内容に誤りがあります。';
      }
      return;
    }
    try {
      console.log('Starting registration in component...');
      const { companyName, email, password } = this.registerForm.value;
      
      // 会社用新規登録の場合のみ重複チェック
      if (this.registerType === 'company') {
        const existingCompanyId = await this.userService.getCompanyIdByName(companyName);
        if (existingCompanyId) {
          this.error = '同じ会社名がすでに登録されています。別の会社名を入力してください。';
          return;
        }
      }

      // 従業員登録の場合、既存の従業員情報と一致するかチェック
      if (this.registerType === 'employee') {
        const { employeeId, lastName, firstName } = this.registerForm.value;
        const companyId = await this.userService.getCompanyIdByName(companyName);
        if (!companyId) {
          this.error = '会社情報が見つかりません。';
          return;
        }

        const employee = await this.userService.getEmployeeProfile(companyId, employeeId);
        if (!employee || employee.lastName !== lastName || employee.firstName !== firstName) {
          this.error = '会社情報に登録されていないため、アカウント作成できません。管理者へ連絡ください';
          return;
        }
      }

      // 会社名と登録種別をlocalStorageに保存
      localStorage.setItem('companyName', companyName);
      localStorage.setItem('registerType', this.registerType);
      if (this.registerType === 'employee') {
        const { employeeId, lastName, firstName } = this.registerForm.value;
        localStorage.setItem('employeeId', employeeId);
        localStorage.setItem('employeeName', `${lastName} ${firstName}`);
      }

      await this.authService.register(email, password);
      this.error = null;
    } catch (error: any) {
      console.error('Error in component:', error);
      this.error = error.message;
    }
  }

  navigateToLogin() {
    // ログイン情報をクリア
    localStorage.removeItem('companyId');
    localStorage.removeItem('companyName');
    localStorage.removeItem('employeeId');
    localStorage.removeItem('employeeName');
    localStorage.removeItem('registerType');
    // ログイン画面へ遷移
    this.router.navigate(['/login']);
  }
}
