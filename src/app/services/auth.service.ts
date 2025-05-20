import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, UserCredential } from '@angular/fire/auth';
import { User } from 'firebase/auth';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private auth: Auth,
    private router: Router
  ) { }

  // ログイン
  login(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  // 新規登録（メール認証送信とルーティングを含む）
  async register(email: string, password: string): Promise<void> {
    try {
      console.log('Starting registration process...');
      // ユーザー登録
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      console.log('User registered successfully:', userCredential.user.email);
      
      // メール認証送信
      await sendEmailVerification(userCredential.user);
      console.log('Verification email sent successfully');
      
      // verify-emailコンポーネントへ遷移
      console.log('Attempting to navigate to verify-email...');
      await this.router.navigate(['/verify-email']);
      console.log('Navigation completed');
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // 現在のユーザー取得
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  // メール認証確認
  async checkEmailVerification(): Promise<boolean> {
    const user = this.getCurrentUser();
    if (!user) return false;
    await user.reload();
    return user.emailVerified;
  }
}
