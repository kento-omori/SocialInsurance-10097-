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

  async getSalaryInfo() {
    const docRef = doc(this.firestore, this.getCollectionPath());
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      throw new Error('Salary info not found');
    }
  }
  
  async addSalaryInfo(salaryInfo: SalaryInfo) {
    if (!this.companyId) {
      throw new Error('Company ID is required');
    }
    const companyProfile = await this.userService.getCompanyProfile(this.companyId);
    this.companyName = companyProfile?.companyName || null;
    
    const docRef = collection(this.firestore, this.getCollectionPath());
    await addDoc(
      docRef, 
      { 
        ...salaryInfo,
        id: docRef.id, 
        createdAt: new Date(), 
        companyId: this.companyId, 
        companyName: this.companyName,
      });
    return docRef.id;
  }

  async updateSalaryInfo(salaryInfo: SalaryInfo) {
    if (!salaryInfo.id) {
      throw new Error('Salary info ID is required');
    }
    const docRef = doc(this.firestore, this.getCollectionPath(), salaryInfo.id);
    await updateDoc(docRef, {
      ...salaryInfo,
      updatedAt: new Date()
    });
  }

  async deleteSalaryInfo(salaryInfo: SalaryInfo) {
    if (!salaryInfo.id) {
      throw new Error('Salary info ID is required');
    }
    const docRef = doc(this.firestore, this.getCollectionPath(), salaryInfo.id);
    await deleteDoc(docRef);
  }
  
  getCollectionPath() {
    return `companies/${this.companyId}/employees/${this.employeeId}/salaryInfo`;
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
      const salaryRef = collection(this.firestore, this.getCollectionPath());
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
}
