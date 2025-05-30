import { Injectable } from '@angular/core';
import { Firestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc, getDocs, query, where, onSnapshot, QuerySnapshot, DocumentData, orderBy, limit } from '@angular/fire/firestore';
import { RouteParamService } from './route-param.service';
import { UserService } from './user.service';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { StandardRemuneration } from '../interface/standard-remuneration';

@Injectable({
  providedIn: 'root'
})
export class StandardRemunerationService {
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

  // 標準報酬月額・賞与額の取得（従業員IDを指定）
  async getStandardRemunerationInfo(employeeId: string, salaryType: string): Promise<StandardRemuneration | null> {
    if (!employeeId) {
      throw new Error('従業員IDが指定されていません');
    }
    if (!salaryType) {
      throw new Error('給与種類が指定されていません');
    }

    const standardRemunerationRef = collection(this.firestore, this.getCollectionPath(employeeId));
    const q = query(
      standardRemunerationRef,
      where('salaryType', '==', salaryType),  // 給与種類でフィルタリング
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as StandardRemuneration;
    }
    return null;
  }

  // 全従業員の標準報酬月額・賞与額を取得
  getAllStandardRemunerationInfo(salaryType: string): Observable<StandardRemuneration[]> {
    return new Observable<StandardRemuneration[]>(observer => {
      if (!this.companyId) {
        observer.next([]);
        return;
      }
      const standardRemunerationRef = collection(this.firestore, `companies/${this.companyId}/employees`);
      const q = query(standardRemunerationRef, where('enrolmentData', '==', true));

      const unsubscribe = onSnapshot(q, 
        async (snapshot) => {
          const standardRemunerationList: StandardRemuneration[] = [];
          for (const employeeDoc of snapshot.docs) {
            const employeeId = employeeDoc.id;
            const standardRemunerationRef = collection(this.firestore, 
              `companies/${this.companyId}/employees/${employeeId}/standardRemuneration`);
            const q = query(standardRemunerationRef, where('salaryType', '==', salaryType), orderBy('standardRemunerationDate', 'desc'), orderBy('createdAt', 'desc'), limit(1));
            const standardRemunerationSnapshot = await getDocs(q);

            if (!standardRemunerationSnapshot.empty) {
              const doc = standardRemunerationSnapshot.docs[0];
              standardRemunerationList.push({
                id: doc.id,
                employeeId: employeeId,
                ...doc.data()
              } as StandardRemuneration);
            }
          }
          observer.next(standardRemunerationList);
        },
        (error) => {
          console.error('エラーが発生しました:', error);
          observer.error(error);
        }
      );
      return () => unsubscribe();
    });
  }

  // 指定された年月時点での最新の標準報酬月額（賞与額）を全従業員分取得
  getLatestStandardRemunerationByDate(salaryType: string, targetDate: string): Observable<StandardRemuneration[]> {
    return new Observable<StandardRemuneration[]>(observer => {
      if (!this.companyId) {
        observer.next([]);
        return;
      }

      const standardRemunerationRef = collection(this.firestore, `companies/${this.companyId}/employees`);
      const q = query(standardRemunerationRef);

      const unsubscribe = onSnapshot(q, 
        async (snapshot) => {
          const standardRemunerationList: StandardRemuneration[] = [];
          
          for (const employeeDoc of snapshot.docs) {
            const employeeId = employeeDoc.id;
            const employeeData = employeeDoc.data();
            
            // 在籍中の従業員のみ処理
            if (employeeData['enrolmentData']) {
              const standardRemunerationRef = collection(this.firestore, 
                `companies/${this.companyId}/employees/${employeeId}/standardRemuneration`);
              
              // 指定された年月以前の最新のデータを取得
              const q = query(
                standardRemunerationRef,
                where('salaryType', '==', salaryType),
                where('standardRemunerationDate', '<=', targetDate),
                orderBy('standardRemunerationDate', 'desc'),
                orderBy('createdAt', 'desc'),
                limit(1)
              );

              const standardRemunerationSnapshot = await getDocs(q);

              if (!standardRemunerationSnapshot.empty) {
                const doc = standardRemunerationSnapshot.docs[0];
                standardRemunerationList.push({
                  id: doc.id,
                  employeeId: employeeId,
                  ...doc.data()
                } as StandardRemuneration);
              }
            }
          }
          
          observer.next(standardRemunerationList);
        },
        (error) => {
          console.error('エラーが発生しました:', error);
          observer.error(error);
        }
      );

      return () => unsubscribe();
    });
  }

  // 標準報酬月額の追加
  async addStandardRemuneration(employeeId: string, data: Partial<StandardRemuneration>) {
    const standardRemunerationRef = collection(this.firestore, this.getCollectionPath(employeeId));
    await addDoc(standardRemunerationRef, {
      ...data,
      createdAt: new Date()
    });
  }

  // 標準報酬月額の更新
  async updateStandardRemuneration(employeeId: string, id: string, data: Partial<StandardRemuneration>) {
    const standardRemunerationRef = doc(this.firestore, this.getCollectionPath(employeeId), id);
    await updateDoc(standardRemunerationRef, {
      ...data,
      updatedAt: new Date()
    });
  }

  // 標準報酬月額の削除
  async deleteStandardRemuneration(employeeId: string, id: string) {
    const standardRemunerationRef = doc(this.firestore, this.getCollectionPath(employeeId), id);
    await deleteDoc(standardRemunerationRef);
  }

  // 標準報酬月額のコレクションパスの取得
  getCollectionPath(employeeId?: string): string {
    if (!this.companyId) {
      throw new Error('会社IDが指定されていません');
    }
    if (!employeeId) {
      throw new Error('従業員IDが指定されていません');
    }
    return `companies/${this.companyId}/employees/${employeeId}/standardRemuneration`;
  }
}
