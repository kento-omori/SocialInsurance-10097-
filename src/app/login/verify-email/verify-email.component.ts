import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CompanyProfile, EmployeeProfile } from '../../interface/employee-company-profile';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.css'
})
export class VerifyEmailComponent implements OnInit, OnDestroy {
  isVerified = false;
  isChecking = false;
  errorMessage = '';
  private checkInterval: any;
  private maxAttempts = 30; // 最大30回（5分間）確認を試みる
  private currentAttempt = 0;
  companyName: string | null = null;
  inputCompanyName: string = '';
  employeeId: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private userService: UserService,
  ) {}

  ngOnInit() {
    this.companyName = localStorage.getItem('companyName');
    this.checkVerification();
    
    // 10秒ごとに確認を実行
    this.checkInterval = setInterval(() => {
      if (!this.isVerified && this.currentAttempt < this.maxAttempts) {
        this.currentAttempt++;
        this.checkVerification();
      } else if (this.currentAttempt >= this.maxAttempts) {
        clearInterval(this.checkInterval);
        this.errorMessage = '確認がタイムアウトしました。「確認する」ボタンをクリックしてください。';
      }
    }, 10000); // 10秒ごとに確認
  }

  ngOnDestroy() {
    // コンポーネントが破棄される際にインターバルをクリア
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  async onCompanyNameSubmit() {
    if (!this.inputCompanyName.trim()) {
      this.errorMessage = '会社名を入力してください。';
      return;
    }
    this.companyName = this.inputCompanyName.trim();
    localStorage.setItem('companyName', this.companyName);
    this.errorMessage = '';
    // 会社名が入力されたら再度認証チェックを実行
    await this.checkVerification();
  }

  async checkVerification() {
    if (this.isChecking) return;
    this.isChecking = true;
    this.errorMessage = '';
    let companyId = '';
    try {
      console.log('メール確認チェックを開始します');
      const isVerified = await this.authService.checkEmailVerification();
      console.log('メール確認状態:', isVerified);
      if (isVerified) {
        this.isVerified = true;
        const user = this.authService.getCurrentUser();
        if (!user) {
          console.error('ユーザー情報の取得に失敗しました');
          this.errorMessage = 'ログインに失敗しました。ログイン画面から再度ログインしてください。';
          return;
        }
        const registerType = localStorage.getItem('registerType');
        if (registerType === 'company') {
          // 会社用プロフィールを保存
          const companyProfile: CompanyProfile = {
            companyId: user.uid,
            companyName: this.companyName || '',
            companyEmail: user.email!,
            createdAt: new Date()
          };
          companyId = user.uid;
          await this.userService.createCompanyProfile(companyProfile);
        } else {
          // ユーザープロフィールを保存（従業員用）
          const companyName = this.companyName || '';
          companyId = await this.userService.getCompanyIdByName(companyName) || '';
          if (!companyId) {
            this.errorMessage = '会社名が見つかりません。正しい会社名を入力してください。';
            this.companyName = null;
            localStorage.removeItem('companyName');
            return;
          }
          const employeeId = localStorage.getItem('employeeId') || '';
          const existingEmployee = await this.userService.getEmployeeProfile(companyId, employeeId);
          if (!existingEmployee) {
            this.errorMessage = '従業員情報が見つかりません。';
            return;
          }
          const userProfile: EmployeeProfile = {
            ...existingEmployee,
            employeeEmail: user.email!,
            updatedAt: new Date()
          };
          this.employeeId = localStorage.getItem('employeeId') || '';
          await this.userService.createEmployeeProfile(companyId, userProfile);
        }
        console.log('プロフィールの保存が完了しました');
        if (this.checkInterval) {
          clearInterval(this.checkInterval);
        }
        // ユーザーのホーム画面に遷移
        try {
          this.router.navigate([`/companies/${companyId}/employee-home/${this.employeeId}`]);
        } catch (navError) {
          console.error('画面遷移エラー:', navError);
          this.errorMessage = '画面遷移に失敗しました。手動でホーム画面に移動してください。';
        }
      }
    } catch (error: any) {
      console.error('メール確認チェック中にエラーが発生しました:', error);
      if (error.message === 'インターネット接続を確認してください。') {
        this.errorMessage = 'インターネット接続を確認してください。接続を確認後、もう一度お試しください。';
      } else {
        this.errorMessage = error.message || 'エラーが発生しました。もう一度お試しください。';
      }
    } finally {
      this.isChecking = false;
    }
  }

  goLogin() {
    this.router.navigate([`/login`]);
  }
}
