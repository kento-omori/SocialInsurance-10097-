import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc, updateDoc as updateDocFirestore, onSnapshot } from '@angular/fire/firestore';
import { RouteParamService } from './route-param.service';
import { ActivatedRoute } from '@angular/router';
import { EmployeeProfile, Role } from '../interface/employee-company-profile';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private companyId: string | null = null;
  private employeeId: string | null = null;
  private rolesSubject = new BehaviorSubject<{ [key: string]: Role[] }>({});

  constructor(
    private firestore: Firestore,
    private routeParamService: RouteParamService,
    private route: ActivatedRoute
  ) {
    this.companyId = this.routeParamService.setCompanyId(this.route);
    this.employeeId = this.routeParamService.setEmployeeId(this.route);
  }

  // 権限情報の変更を監視
  subscribeToRoles(companyId: string): Observable<{ [key: string]: Role[] }> {
    const employeesRef = collection(this.firestore, `companies/${companyId}/employees`);
    const q = query(employeesRef, where('enrolmentData', '==', true));

    onSnapshot(q, (snapshot) => {
      const roles: { [key: string]: Role[] } = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        const employeeId = doc.id;
        const employeeRoles = data['roles'] || [];
        roles[employeeId] = employeeRoles.map((role: any) => ({
          type: role.type,
          createdAt: role.createdAt.toDate(),
          isDeleted: role.isDeleted
        }));
      });
      this.rolesSubject.next(roles);
    });
    return this.rolesSubject.asObservable();
  }

  // 権限情報を取得
  async getRoles(companyId: string, employeeId: string): Promise<Role[]> {
    const employeeDoc = doc(this.firestore, `companies/${companyId}/employees/${employeeId}`);
    const employeeSnap = await getDoc(employeeDoc);
    const data = employeeSnap.data();
    const roles = data?.['roles'] || [];
    return roles.map((role: any) => ({
      type: role.type,
      createdAt: role.createdAt.toDate(),
      isDeleted: role.isDeleted
    }));
  }

  // 追加・復活
  async addOrReviveRole(companyId: string, employeeId: string, role: Role): Promise<void> {
    const employeeDoc = doc(this.firestore, this.getCollectionPath(companyId, employeeId));
    const employeeSnap = await getDoc(employeeDoc);
    const data = employeeSnap.data() as EmployeeProfile;
    let roles = data?.roles || [];
    const idx = roles.findIndex(r => r.type === role.type);
    if (idx >= 0) {
      // 復活
      roles[idx] = { ...role, isDeleted: false, deletedAt: null };
    } else {
      // 追加
      roles.push({ ...role, isDeleted: false, deletedAt: null });
    }
    await updateDocFirestore(employeeDoc, { roles });
  }

  // 更新
  async updateRole(companyId: string, employeeId: string, role: Role): Promise<void> {
    const employeeDoc = doc(this.firestore, this.getCollectionPath(companyId, employeeId));
    const employeeSnap = await getDoc(employeeDoc);
    const data = employeeSnap.data() as EmployeeProfile;
    let roles = data?.roles || [];
    const idx = roles.findIndex(r => r.type === role.type);
    if (idx >= 0) {
      roles[idx] = { ...role };
      await updateDocFirestore(employeeDoc, { roles });
    }
  }

  // 理論削除
  async deleteRole(companyId: string, employeeId: string, type: 'admin' | 'approver'): Promise<void> {
    const employeeDoc = doc(this.firestore, this.getCollectionPath(companyId, employeeId));
    const employeeSnap = await getDoc(employeeDoc);
    const data = employeeSnap.data() as EmployeeProfile;
    let roles = data?.roles || [];
    const idx = roles.findIndex(r => r.type === type);
    if (idx >= 0) {
      roles[idx] = { ...roles[idx], isDeleted: true, deletedAt: new Date() };
      await updateDocFirestore(employeeDoc, { roles });
    }
  }

  getCollectionPath(companyId: string, employeeId: string): string {
    return `companies/${companyId}/employees/${employeeId}`;
  }

  // 管理者と承認者の人数を計算
  calculateRoleCounts(roles: { [key: string]: Role[] }): { adminCount: number; approverCount: number } {
    let adminCount = 0;
    let approverCount = 0;

    Object.values(roles).forEach(employeeRoles => {
      const hasAdmin = employeeRoles.some(role => role.type === 'admin' && !role.isDeleted);
      const hasApprover = employeeRoles.some(role => role.type === 'approver' && !role.isDeleted);

      if (hasAdmin) adminCount++;
      if (hasApprover) approverCount++;
    });

    return { adminCount, approverCount };
  }
}
