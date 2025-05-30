import { Injectable } from '@angular/core';
import { Firestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc, getDocs, query, where, onSnapshot } from '@angular/fire/firestore';
import { RouteParamService } from './route-param.service';
import { Office } from '../interface/office.interface';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private companyId: string | null = null;
  private officesSubject = new BehaviorSubject<Office[]>([]);

  constructor(
    private firestore: Firestore,
    private routeParamService: RouteParamService
  ) {}

  setCompanyId(companyId: string) {
    this.companyId = companyId;
  }

  // 事業所情報の変更を監視
  subscribeToOffices(): Observable<Office[]> {
    if (!this.companyId) {
      throw new Error('会社IDが設定されていません');
    }
    const officesRef = this.getCollectionPath();
    const q = query(officesRef, where('isDeleted', '==', false));

    onSnapshot(q, (snapshot) => {
      const offices = snapshot.docs.map(doc => {
        const data = doc.data();
        const office = {
          id: doc.id,
          ...data
        } as Office;
        
        // FirestoreのTimestampをDate型に変換
        if (data['createdAt']) {
          office.createdAt = data['createdAt'].toDate();
        }
        if (data['updatedAt']) {
          office.updatedAt = data['updatedAt'].toDate();
        }
        if (data['deletedAt']) {
          office.deletedAt = data['deletedAt'].toDate();
        }
        
        return office;
      });
      // 登録日時でソート（古い順）
      offices.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      this.officesSubject.next(offices);
    });

    return this.officesSubject.asObservable();
  }

  async addOffice(office: Office) {
    const officeCollection = this.getCollectionPath();
    const officeData = {
      ...office,
      createdAt: new Date(),
      isDeleted: false,
      deletedAt: null
    };
    await addDoc(officeCollection, officeData);
  }

  async updateOffice(officeId: string, office: Partial<Office>) {
    const officeRef = doc(this.getCollectionPath(), officeId);
    const officeData = {
      ...office,
      updatedAt: new Date()
    };
    await updateDoc(officeRef, officeData);
  }

  async deleteOffice(officeId: string) {
    const officeRef = doc(this.getCollectionPath(), officeId);
    await updateDoc(officeRef, {
      isDeleted: true,
      deletedAt: new Date()
    });
  }

  async getOffices(): Promise<Office[]> {
    const officesRef = this.getCollectionPath();
    const q = query(officesRef, where('isDeleted', '==', false));
    const querySnapshot = await getDocs(q);
    const offices = querySnapshot.docs.map(doc => {
      const data = doc.data();
      const office = {
        id: doc.id,
        ...data
      } as Office;
      
      // FirestoreのTimestampをDate型に変換
      if (data['createdAt']) {
        office.createdAt = data['createdAt'].toDate();
      }
      if (data['updatedAt']) {
        office.updatedAt = data['updatedAt'].toDate();
      }
      if (data['deletedAt']) {
        office.deletedAt = data['deletedAt'].toDate();
      }
      
      return office;
    });
    // 登録日時でソート（古い順）
    return offices.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  private getCollectionPath() {
    if (!this.companyId) {
      throw new Error('会社IDが設定されていません');
    }
    return collection(this.firestore, `companies/${this.companyId}/offices`);
  }
}
