import { Injectable } from '@angular/core';
import { Firestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc, getDocs, query, where, onSnapshot, QuerySnapshot, DocumentData } from '@angular/fire/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { ActivatedRoute } from '@angular/router';
import { RouteParamService } from './route-param.service';
import { BasicInfo } from '../interface/employee-info';
import { Timestamp } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {

  private companyId: string | null = null;
  private employeeId: string | null = null;

  constructor(
    private firestore: Firestore,
    private routeParamService: RouteParamService,
    private route: ActivatedRoute
  ) {
    // companyId, employeeIdの購読
    this.routeParamService.companyId$.subscribe(id => {
      this.companyId = id;
    });
    this.routeParamService.employeeId$.subscribe(id => {
      this.employeeId = id;
    });
  }

  // 従業員の基本情報履歴のコレクションパスを取得
  getCollectionPath() {
    if (!this.companyId || !this.employeeId) {
      throw new Error('会社IDまたは従業員IDが設定されていません');
    }
    const collectionPath = collection(this.firestore, 'companies', this.companyId, 'employees', this.employeeId, 'basicInfo');
    return collectionPath;
  }

  // 従業員の基本情報履歴を取得
  async getBasicInfo() {
    if (!this.companyId || !this.employeeId) {
      throw new Error('会社IDまたは従業員IDが設定されていません');
    }
    const collectionRef = this.getCollectionPath();
    const snapshot = await getDocs(collectionRef);
    const basicInfoList = snapshot.docs.map(doc => {
      const data = doc.data() as BasicInfo & { createdAt?: any };
      // Timestamp型ならDate型に変換
      if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        data.createdAt = data.createdAt.toDate();
      }
      return data as BasicInfo;
    });
    if (basicInfoList.length > 0) {
      // createdAtの降順でソート
      return basicInfoList.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
    }
    throw new Error('基本情報履歴がありません');
  }

  // 従業員の基本情報を更新（ない場合は、新規作成）
  async addBasicInfo(basicInfo: BasicInfo) {
    if (!this.companyId || !this.employeeId) {
      throw new Error('会社IDまたは従業員IDが設定されていません');
    }
    const collectionRef = collection(this.firestore, 'companies', this.companyId, 'employees', this.employeeId, 'basicInfo');
    const docRef = await addDoc(collectionRef, basicInfo);
    await setDoc(docRef, { ...basicInfo, id: docRef.id }, { merge: true });
    return docRef.id;
  }

  // 従業員の基本情報履歴をリアルタイムで取得
  getBasicInfoRealtime(): Observable<BasicInfo[]> {
    return new Observable<BasicInfo[]>(subscriber => {
      const collectionRef = this.getCollectionPath();
      const unsubscribe = onSnapshot(collectionRef, (snapshot: QuerySnapshot<DocumentData>) => {
        const basicInfoList = snapshot.docs.map(doc => {
          const data = doc.data() as BasicInfo & { createdAt?: any };
          if (data.createdAt && typeof data.createdAt.toDate === 'function') {
            data.createdAt = data.createdAt.toDate();
          }
          return data as BasicInfo;
        });
        subscriber.next(
          basicInfoList.sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
          })
        );
      });
      // クリーンアップ
      return () => unsubscribe();
    });
  }

  // storageにファイルを保存
  async uploadFile(file: File, fileType: string) {
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}_${file.name}`;
    const storage = getStorage();
    const storageRef = ref(storage, `${this.getFilePath(fileType)}/${uniqueFileName}`);
    let contentType = file.type;
    if (contentType === 'text/plain') {
      contentType += ';charset=utf-8';
    };
    const metadata = { contentType: contentType };
    await uploadBytes(storageRef, file, metadata);
    return await getDownloadURL(storageRef);
  }

  // ファイルのダウンロードURLの取得
  async getFileUrl(filePath: string): Promise<string> {
    const storage = getStorage();
    const storageRef = ref(storage, filePath);
    return await getDownloadURL(storageRef);
  }

  // ファイルの削除
  async deleteFile(filePath: string): Promise<void> {
    const storage = getStorage();
    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);
  }

  getFilePath(fileType: string) {
    let path = '';
    if (!this.companyId || !this.employeeId) {
      throw new Error('会社IDまたは従業員IDが設定されていません');
    }

    if (fileType === 'myNumberFile') {
      path = `${this.companyId}/${this.employeeId}/myNumberFile`;
    } else if (fileType === 'basicPensionNumberFile') {
      path = `${this.companyId}/${this.employeeId}/basicPensionNumberFile`;
    } else if (fileType === 'familyMyNumberFile') {
      path = `${this.companyId}/${this.employeeId}/familyMyNumberFile`;
    } else if (fileType === 'familyBasicPensionNumberFile') {
      path = `${this.companyId}/${this.employeeId}/familyBasicPensionNumberFile`;
    }
    return path;
  }
}
