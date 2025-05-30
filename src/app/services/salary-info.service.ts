import { Injectable } from '@angular/core';
import { Firestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc, getDocs, query, where, onSnapshot, QuerySnapshot, DocumentData } from '@angular/fire/firestore';
import { RouteParamService } from './route-param.service';
import { ActivatedRoute } from '@angular/router';
import { SalaryInfo } from '../interface/salary-info';
import { Observable } from 'rxjs';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class SalaryInfoService {
  private companyId: string | null = null;
  private employeeId: string | null = null;
  private companyName: string | null = null;

  constructor(
    private firestore: Firestore,
    private routeParamService: RouteParamService,
    private route: ActivatedRoute,
    private userService: UserService
  ) {
    // companyId, employeeIdの購読
    this.routeParamService.companyId$.subscribe(id => {
      this.companyId = id;
    });
    this.routeParamService.employeeId$.subscribe(id => {
      this.employeeId = id;
    });
  }

  async getSalaryInfo(employeeId: string) {
    if (!employeeId) {
      throw new Error('Employee ID is required');
    }
    const docRef = doc(this.firestore, this.getCollectionPath(employeeId));
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      throw new Error('Salary info not found');
    }
  }
  
  private getCollectionPath(employeeId?: string): string {
    if (!this.companyId) {
      throw new Error('Company ID is required');
    }
    if (!employeeId) {
      throw new Error('Employee ID is required');
    }
    return `companies/${this.companyId}/employees/${employeeId}/salaryInfo`;
  }

  // 新規追加ロジック（手入力）
  async addSalaryInfo(salaryInfo: SalaryInfo) {
    if (!this.companyId) {
      throw new Error('Company ID is required');
    }
    if (!salaryInfo.employeeId) {
      throw new Error('Employee ID is required');
    }

    const companyProfile = await this.userService.getCompanyProfile(this.companyId);
    this.companyName = companyProfile?.companyName || null;
    
    const docRef = collection(this.firestore, this.getCollectionPath(salaryInfo.employeeId));
    const newDoc = doc(docRef);  // 新しいドキュメントIDを生成
    await setDoc(newDoc, { 
      ...salaryInfo,
      id: newDoc.id,  // 生成されたIDを直接使用
      companyId: this.companyId, 
      companyName: this.companyName,
      createdAt: new Date(), 
      updatedAt: new Date()  // 初回登録時もupdatedAtを設定
    });
  }

  // 給与情報の更新
  async updateSalaryInfo(salaryInfo: SalaryInfo) {
    if (!salaryInfo.employeeId) {
      throw new Error('Employee ID is required');
    }
    if (!salaryInfo.id) {
      throw new Error('Salary info ID is required');
    }

    const docRef = doc(this.firestore, this.getCollectionPath(salaryInfo.employeeId), salaryInfo.id);
    await updateDoc(docRef, {
      ...salaryInfo,
      updatedAt: new Date()  // 更新時はupdatedAtを更新
    });
  }

  async deleteSalaryInfo(salaryInfo: SalaryInfo) {
    if (!salaryInfo.id) {
      throw new Error('Salary info ID is required');
    }
    if (!salaryInfo.employeeId) {
      throw new Error('Employee ID is required');
    }
    const docRef = doc(this.firestore, this.getCollectionPath(salaryInfo.employeeId), salaryInfo.id);
    await deleteDoc(docRef);
  }
  
  // 全従業員の給与情報を取得
  subscribeToAllSalaryInfo(): Observable<SalaryInfo[]> {
    return new Observable<SalaryInfo[]>(observer => {
      if (!this.companyId) {
        observer.next([]);
        return;
      }

      // コレクションパスを修正
      const salaryRef = collection(this.firestore, `companies/${this.companyId}/employees`);
      const q = query(salaryRef);

      const unsubscribe = onSnapshot(q, 
        async (snapshot) => {
          const salaryInfoList: SalaryInfo[] = [];
          
          // 各従業員の給与情報を取得
          for (const employeeDoc of snapshot.docs) {
            const employeeId = employeeDoc.id;
            const salaryInfoRef = collection(this.firestore, 
              `companies/${this.companyId}/employees/${employeeId}/salaryInfo`);
            const salarySnapshot = await getDocs(salaryInfoRef);
            
            salaryInfoList.push(...salarySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as SalaryInfo)));
          }
          
          observer.next(salaryInfoList);
        },
        (error) => {
          observer.error(error);
        }
      );

      return () => unsubscribe();
    });
  }

  // 特定の従業員の給与情報を取得
  subscribeToEmployeeSalaryInfo(employeeId: string): Observable<SalaryInfo[]> {
    return new Observable<SalaryInfo[]>(observer => {
      if (!this.companyId || !employeeId) {
        observer.next([]);
        return;
      }

      // 正しいコレクションパスを使用
      const salaryRef = collection(this.firestore, this.getCollectionPath(employeeId));
      const q = query(salaryRef);

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const salaryInfoList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as SalaryInfo));
          observer.next(salaryInfoList);
        },
        (error) => {
          observer.error(error);
        }
      );

      return () => unsubscribe();
    });
  }

  // 支給年月と給与種類で給与情報を取得
  async getSalaryInfoByPaymentDateAndType(employeeId: string, paymentDate: string, salaryType: string): Promise<SalaryInfo | null> {
    if (!this.companyId) {
      throw new Error('Company ID is required');
    }
    const salaryRef = collection(this.firestore, this.getCollectionPath(employeeId));
    const q = query(
      salaryRef,
      where('paymentDate', '==', paymentDate),
      where('salaryType', '==', salaryType)
    );
    console.log('q', q);

    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as SalaryInfo;
    }
    return null;
  }
}
