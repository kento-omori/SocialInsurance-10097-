import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnChanges {
  @Input() registerType: 'company' | 'employee' = 'company';
  @Output() backToLogin = new EventEmitter<void>();

  registerForm: FormGroup;
  error: string | null = null;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router, private userService: UserService) {
    this.registerForm = this.createForm('company');
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['registerType']) {
      this.registerForm = this.createForm(this.registerType);
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
        displayName: ['', [Validators.required, Validators.pattern(/^(?!\s+$).+/)]],
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

      // 会社名と登録種別をlocalStorageに保存
      localStorage.setItem('companyName', companyName);
      localStorage.setItem('registerType', this.registerType);
      if (this.registerType === 'employee') {
        const { employeeId, displayName } = this.registerForm.value;
        localStorage.setItem('employeeId', employeeId);
        localStorage.setItem('employeeName', displayName);
      }

      await this.authService.register(email, password);
      this.error = null;
    } catch (error: any) {
      console.error('Error in component:', error);
      this.error = error.message;
    }
  }

  navigateToLogin() {
    this.backToLogin.emit();
  }
}
