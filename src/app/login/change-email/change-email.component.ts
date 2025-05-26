import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { RouteParamService } from '../../services/route-param.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-change-email',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './change-email.component.html',
  styleUrl: './change-email.component.css'
})
export class ChangeEmailComponent {
  changeEmailForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private routeParamService: RouteParamService,
    private toastr: ToastrService,
    private userService: UserService
  ) {
    this.changeEmailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  async onChangeEmail() {
    this.errorMessage = '';
    this.successMessage = '';
    const newEmail = this.changeEmailForm.value.email?.trim().toLowerCase();
    if (!newEmail) {
      this.errorMessage = '新しいメールアドレスを入力してください。';
      return;
    }
    try {
      const user = this.authService.getCurrentUser();
      if (!user) {
        this.errorMessage = 'ユーザーがログインしていません。';
        return;
      }
      const oldEmail = user.email!;
      await this.authService.changeEmail(newEmail);
      const result = await this.userService.changeEmail(oldEmail, newEmail);
      if (result === 'company') {
        this.successMessage = '会社のメールアドレスを変更しました。';
      } else if (result === 'employee') {
        this.successMessage = '従業員のメールアドレスを変更しました。';
      } else {
        this.successMessage = 'メールアドレスを変更しましたが、データベースの更新に失敗しました。';
      }
      this.toastr.success(this.successMessage);
      this.routeParamService.goToLogin();
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        this.errorMessage = 'すでに登録済みのメールアドレスです。別のメールアドレスを入力してください。';
      } else {
        this.errorMessage = 'メールアドレスの変更に失敗しました。再認証が必要な場合があります。';
      }
      this.toastr.error(this.errorMessage);
    }
  }

  goToLogin() {
    this.routeParamService.goToLogin();
  }
}
