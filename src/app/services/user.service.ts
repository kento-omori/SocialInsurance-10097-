import { Injectable } from '@angular/core';
import { Firestore, doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc } from '@angular/fire/firestore';
import { CompanyProfile, EmployeeProfile } from '../interface/employee-company-profile';

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

  // 従業員プロフィール作成・更新
  async createEmployeeProfile(companyId: string, employeeProfile: EmployeeProfile): Promise<void> {
    const employeeRef = doc(this.firestore, `companies/${companyId}/employees/${employeeProfile.employeeId}`);
    const existingDoc = await getDoc(employeeRef);

    if (!existingDoc.exists()) {
      // 新規作成の場合
      await setDoc(employeeRef, {
        ...employeeProfile,
        createdAt: new Date(),
      });
    } else {
      // 既存データがある場合、更新
      await updateDoc(employeeRef, {
        ...employeeProfile,
        updatedAt: new Date()
      });
    }
  }

  // 従業員退職処理
  async retireEmployee(companyId: string, employeeProfile: EmployeeProfile): Promise<void> {
    const employeeRef = doc(this.firestore, `companies/${companyId}/employees/${employeeProfile.employeeId}`);
    await updateDoc(employeeRef, {
      enrolmentData: false,
      retireEra: employeeProfile.retireEra,
      retireYear: employeeProfile.retireYear,
      retireMonth: employeeProfile.retireMonth,
      retireDay: employeeProfile.retireDay,
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

  // メールアドレス変更メソッド
  async changeEmail(oldEmail: string, newEmail: string): Promise<'company' | 'employee' | null> {
    // 会社用か判定
    const companiesRef = collection(this.firestore, 'companies');
    const companyQuery = query(companiesRef, where('companyEmail', '==', oldEmail));
    const companySnapshot = await getDocs(companyQuery);
    if (!companySnapshot.empty) {
      const companyDoc = companySnapshot.docs[0];
      await updateDoc(companyDoc.ref, {
        companyEmail: newEmail,
        updatedAt: new Date()
      });
      return 'company';
    }

    // 従業員用か判定
    const companies = await getDocs(companiesRef);
    for (const company of companies.docs) {
      const employeesRef = collection(this.firestore, `companies/${company.id}/employees`);
      const employeeQuery = query(employeesRef, where('employeeEmail', '==', oldEmail));
      const employeeSnapshot = await getDocs(employeeQuery);
      if (!employeeSnapshot.empty) {
        const employeeDoc = employeeSnapshot.docs[0];
        await updateDoc(employeeDoc.ref, {
          employeeEmail: newEmail,
          updatedAt: new Date()
        });
        return 'employee';
      }
    }

    // どちらにも該当しない場合
    return null;
  }
}