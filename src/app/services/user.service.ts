import { Injectable } from '@angular/core';
import { Firestore, doc, setDoc, getDoc, collection, query, where, getDocs } from '@angular/fire/firestore';

export interface CompanyProfile {
  companyId: string;
  companyName: string;
  companyEmail: string;
  createdAt: Date;
}

export interface EmployeeProfile {
  userId?: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  createdAt: Date;
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

  // 会社プロフィール取得
  async getCompanyProfile(companyId?: string): Promise<{ companyName: string, companyEmail: string } | null> {
    // companyIdが引数で渡されていなければlocalStorageから取得
    if (!companyId) {
      companyId = localStorage.getItem('companyId') || '';
    }
    if (!companyId) return null;

    const docment = await getDoc(doc(this.firestore, 'companies', companyId));
    if (docment.exists()) {
      const data = docment.data();
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
}