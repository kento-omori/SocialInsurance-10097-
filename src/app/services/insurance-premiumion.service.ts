import { Injectable } from '@angular/core';
import { Firestore, collection, doc, setDoc, updateDoc, query, where, getDocs, getDoc, orderBy, limit } from '@angular/fire/firestore';
import { Premiums, totalPremium } from '../interface/premiums';
import { BehaviorSubject } from 'rxjs';

interface PremiumCalculationInfo {
  companyId: string;
  employeeId: string;
  paymentDate: string;
  salaryType: string;
}

@Injectable({
  providedIn: 'root'
})
export class InsurancePremiumionService {
  private premiumCalculationTrigger = new BehaviorSubject<PremiumCalculationInfo[] | null>(null);
  private lastCalculations: { [key: string]: PremiumCalculationInfo[] } = {};
  premiumCalculationTrigger$ = this.premiumCalculationTrigger.asObservable();

  constructor(private firestore: Firestore) { }

  // 給与情報が登録されたら発火　→　計算ロジックへ情報渡す
  triggerPremiumCalculation(calculations: PremiumCalculationInfo[]) {
    const companyId = calculations[0]?.companyId;     // 会社IDごとに最新の計算情報を保持
    if (companyId) {
      this.lastCalculations[companyId] = calculations;
    }
    this.premiumCalculationTrigger.next(calculations);
  }

  // 最新の給与情報を取得
  async getLatestSalaryInfo(companyId: string): Promise<{ paymentDate: string; salaryType: string } | null> {
    try {
      const employeesRef = collection(this.firestore, 'companies', companyId, 'employees');
      const employeesSnapshot = await getDocs(employeesRef);
      
      let latestSalary: { paymentDate: string; salaryType: string } | null = null;
      
      for (const employeeDoc of employeesSnapshot.docs) {
        const salaryInfoRef = collection(this.firestore, 'companies', companyId, 'employees', employeeDoc.id, 'salaryInfo');
        const q = query(salaryInfoRef, orderBy('createdAt', 'desc'), limit(1));
        const salarySnapshot = await getDocs(q);
        
        if (!salarySnapshot.empty) {
          const salaryData = salarySnapshot.docs[0].data();
          if (!latestSalary || salaryData['createdAt'].toDate() > new Date(latestSalary.paymentDate)) {
            latestSalary = {
              paymentDate: salaryData['paymentDate'],
              salaryType: salaryData['salaryType']
            };
          }
        }
      }
      
      return latestSalary;
    } catch (error) {
      console.error('最新の給与情報の取得に失敗:', error);
      return null;
    }
  }

  // 給与情報の最終更新日時を取得
  async getLatestSalaryUpdateTime(companyId: string, employeeId: string, paymentDate: string, salaryType: string): Promise<Date | null> {
    try {
      if (salaryType === '月額') {
        salaryType = '給与';
      }
      console.log('salaryType', salaryType);
      const salaryInfoRef = collection(this.firestore, 'companies', companyId, 'employees', employeeId, 'salaryInfo');
      const salaryInfoSnapshot = await getDocs(salaryInfoRef);
      console.log('salaryInfoSnapshot', salaryInfoSnapshot.docs[0].data());
      if (!salaryInfoSnapshot.empty) {
        for (const doc of salaryInfoSnapshot.docs) {
          const data = doc.data();
          if (data['paymentDate'] === paymentDate && data['salaryType'] === salaryType) {
            return data['updatedAt']?.toDate() || null;
          }
        }
      }
      return null;
    } catch (error) {
      console.error('給与情報の最終更新日時の取得に失敗:', error);
      return null;
    }
  }

  // 保険料情報を保存
  async savePremiumInfo(companyId: string, employeeId: string, premium: Premiums): Promise<void> {
    try {
      // 既存の保険料情報を検索
      const premiumsRef = collection(this.firestore, 'companies', companyId, 'employees', employeeId, 'premiumsInfo');
      const q = query(
        premiumsRef,
        where('paymentDate', '==', premium.paymentDate),
        where('salaryType', '==', premium.salaryType)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // 既存データがある場合は更新
        const existingDoc = querySnapshot.docs[0];
        await updateDoc(doc(this.firestore, existingDoc.ref.path), {
          ...premium,
          updatedAt: new Date()
        });
      } else {
        // 新規データの場合は追加
        const docRef = doc(this.firestore, 'companies', companyId, 'employees', employeeId, 'premiumsInfo', `${premium.paymentDate}_${premium.salaryType}`);
        await setDoc(docRef, {
          ...premium,
          createdAt: new Date()
        });
      }
    } catch (error) {
      console.error('保険料情報の保存に失敗:', error);
      throw error;
    }
  }

  // 会社納付額を保存
  async saveTotalPremiums(companyId: string, totalPremiums: totalPremium): Promise<void> {
    try {
      const docRef = doc(this.firestore, 'companies', companyId, 'totalPremiums', `${totalPremiums.paymentDate}_${totalPremiums.salaryType}`);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        // 既存データがある場合は更新
        await updateDoc(docRef, {
          ...totalPremiums,
          updatedAt: new Date()
        });
      } else {
        // 新規データの場合は追加
        await setDoc(docRef, {
          ...totalPremiums,
          createdAt: new Date()
        });
      }
    } catch (error) {
      console.error('会社納付額の保存に失敗:', error);
      throw error;
    }
  }

  // 計算済みの保険料情報を取得
  async getCalculatedPremiums(companyId: string, paymentDate: string, salaryType: string): Promise<Premiums[]> {
    try {
      const premiumsRef = collection(this.firestore, 'companies', companyId, 'premiumsInfo');
      const q = query(
        premiumsRef,
        where('paymentDate', '==', paymentDate),
        where('salaryType', '==', salaryType)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return querySnapshot.docs.map(doc => doc.data() as Premiums);
      }
      return [];
    } catch (error) {
      console.error('保険料情報の取得に失敗:', error);
      return [];
    }
  }

  // 計算済みの会社納付額を取得
  async getCalculatedTotalPremiums(companyId: string, paymentDate: string, salaryType: string): Promise<totalPremium | null> {
    try {
      const docRef = doc(this.firestore, 'companies', companyId, 'totalPremiums', `${paymentDate}_${salaryType}`);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as totalPremium;
      }
      return null;
    } catch (error) {
      console.error('会社納付額の取得に失敗:', error);
      return null;
    }
  }

  // 保険料情報の最終更新日時を取得
  async getLatestPremiumUpdateTime(companyId: string, employeeId: string, paymentDate: string, salaryType: string): Promise<Date | null> {
    try {
      const premiumsRef = collection(this.firestore, 'companies', companyId, 'employees', employeeId, 'premiumsInfo');
      const q = query(
        premiumsRef,
        where('paymentDate', '==', paymentDate),
        where('salaryType', '==', salaryType),
        orderBy('updatedAt', 'desc'),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        return data['updatedAt']?.toDate() || null;
      }
      return null;
    } catch (error) {
      console.error('保険料情報の最終更新日時の取得に失敗:', error);
      return null;
    }
  }
}
