import { Injectable } from '@angular/core';
import { Firestore, doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc } from '@angular/fire/firestore';

export interface CompanyProfile {
  companyId: string;
  companyName: string;
  companyEmail: string;
  createdAt: Date;
}

export interface EmployeeProfile {
  userId?: string; //アカウント登録時
  companyId: string;  //マスターデータ登録時
  companyName: string; //マスターデータ登録時
  employeeId: string; //マスターデータ登録時
  employeeName: string; //マスターデータ登録時
  employeeAttribute: string; //マスターデータ登録時
  insuredStatus: string[]; //マスターデータ登録時
  employeeEmail?: string; //アカウント登録時
  enrolmentData: boolean; // 在籍・退職フラグ
  createdAt: Date; //マスターデータ登録時
  updatedAt?: Date; //マスターデータ更新やアカウント登録時
  retiredAt?: Date; // 退職登録時
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private firestore: Firestore) {}

  // 会社プロフィール作成
  async createCompanyProfile(companyProfile: CompanyProfile): Promise<void> {
    const companyRef = doc(this.firestore, `companies/${companyProfile.companyId}`);
    await setDoc(companyRef, companyProfile);
  }

  // 従業員プロフィール作成
  async createEmployeeProfile(companyId: string, employeeProfile: EmployeeProfile): Promise<void> {
    const employeeRef = doc(this.firestore, `companies/${companyId}/employees/${employeeProfile.employeeId}`);
    await setDoc(employeeRef, employeeProfile);
  }

  // 従業員プロフィール更新
  async updateEmployeeProfile(companyId: string, employeeProfile: EmployeeProfile): Promise<void> {
    const employeeRef = doc(this.firestore, `companies/${companyId}/employees/${employeeProfile.employeeId}`);
    await updateDoc(employeeRef, {
      employeeName: employeeProfile.employeeName,
      employeeAttribute: employeeProfile.employeeAttribute,
      insuredStatus: employeeProfile.insuredStatus,
      enrolmentData: employeeProfile.enrolmentData,
      updatedAt: new Date()
    });
  }

  // 従業員退職処理
  async retireEmployee(companyId: string, employeeProfile: EmployeeProfile): Promise<void> {
    const employeeRef = doc(this.firestore, `companies/${companyId}/employees/${employeeProfile.employeeId}`);
    await updateDoc(employeeRef, {
      enrolmentData: false,
      retiredAt: new Date()
    });
  }

  // 会社プロフィール取得
  async getCompanyProfile(companyId?: string): Promise<{ companyName: string, companyEmail: string } | null> {
    // companyIdが引数で渡されていなければlocalStorageから取得
    if (!companyId) {
      companyId = localStorage.getItem('companyId') || '';
    }
    console.log('UserService - getCompanyProfile - companyId:', companyId);
    if (!companyId) return null;

    const docment = await getDoc(doc(this.firestore, 'companies', companyId));
    console.log('UserService - getCompanyProfile - document exists:', docment.exists());
    if (docment.exists()) {
      const data = docment.data();
      console.log('UserService - getCompanyProfile - data:', data);
      return {
        companyName: data['companyName'],
        companyEmail: data['companyEmail']
      };
    }
    return null;
  }

  // 従業員プロフィール取得
  async getEmployeeProfile(companyId: string, employeeId: string): Promise<EmployeeProfile | null> {
    const employeeRef = doc(this.firestore, `companies/${companyId}/employees/${employeeId}`);
    const snap = await getDoc(employeeRef);
    return snap.exists() ? (snap.data() as EmployeeProfile) : null;
  }

  // 従業員一覧取得
  async getEmployees(companyId: string): Promise<EmployeeProfile[]> {
    const employeesRef = collection(this.firestore, `companies/${companyId}/employees`);
    const querySnapshot = await getDocs(employeesRef);
    return querySnapshot.docs.map(doc => doc.data() as EmployeeProfile);
  }

  // 会社名からcompanyIdを取得
  async getCompanyIdByName(companyName: string): Promise<string | null> {
    const companiesRef = collection(this.firestore, 'companies');
    const q = query(companiesRef, where('companyName', '==', companyName));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id;
    }
    return null;
  }

  // companyIdとemailからemployeeIdを取得
  async getEmployeeIdByEmail(companyId: string, email: string): Promise<string | null> {
    const employeesRef = collection(this.firestore, `companies/${companyId}/employees`);
    const q = query(employeesRef, where('employeeEmail', '==', email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data();
      return data['employeeId'] || null;
    }
    return null;
  }

  // 社員番号の重複チェック
  async isEmployeeIdExists(companyId: string, employeeId: string): Promise<boolean> {
    const employeesRef = collection(this.firestore, 'companies', companyId, 'employees');
    const q = query(employeesRef, where('employeeId', '==', employeeId));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  }
}