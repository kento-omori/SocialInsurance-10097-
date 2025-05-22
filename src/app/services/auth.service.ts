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
      // ユーザー登録
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);      
      // メール認証送信
      await sendEmailVerification(userCredential.user);
      // verify-emailコンポーネントへ遷移
      await this.router.navigate(['/verify-email']);
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
