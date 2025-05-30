import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouteParamService } from '../../services/route-param.service';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '../../services/user.service';
import { RoleService } from '../../services/role.service';
import { ToastrService } from 'ngx-toastr';
import { EmployeeProfile, Role } from '../../interface/employee-company-profile';

@Component({
  selector: 'app-role',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './role.component.html',
  styleUrl: './role.component.css'
})
export class RoleComponent implements OnInit, OnDestroy {
  companyId: string = '';
  searchForm: FormGroup;
  searchResults: EmployeeProfile[] = [];
  allEmployees: EmployeeProfile[] = [];
  roles: Role[] = [];
  selectedEmployee: EmployeeProfile | null = null;
  selectedRoleType: 'admin' | 'approver' | null = null;
  selectedAction: 'add' | 'delete' | null = null;
  adminAction: 'add' | 'delete' | null = null;
  approverAction: 'add' | 'delete' | null = null;
  isRegistering = false;
  allEmployeeRoles: { [key: string]: Role[] } = {};
  private subscription: any;
  adminEmployees: EmployeeProfile[] = [];  // 管理者権限を持つ従業員の一覧
  isSearched = false;  // 検索ボタンが押されたかどうかのフラグ

  constructor(
    private route: ActivatedRoute,
    private routeParamService: RouteParamService,
    private userService: UserService,
    private fb: FormBuilder,
    private roleService: RoleService,
    private toastr: ToastrService
  ) {
    this.searchForm = this.fb.group({
      allEmployeeId: [{ value: '', disabled: true }],
      employeeId: [''],
      employeeName: [''],
      employeeAttribute: ['']
    });
  }

  ngOnInit() {
    this.companyId = this.routeParamService.setCompanyId(this.route);
    this.loadAllEmployees();
    // 権限情報の変更を監視
    this.subscription = this.roleService.subscribeToRoles(this.companyId).subscribe(roles => {
      this.allEmployeeRoles = roles;
      this.updateAdminEmployees();  // 権限情報が更新されたら管理者一覧も更新
    });
  }

  ngOnDestroy() {
    // コンポーネント破棄時に購読を解除
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  goHome() {
    this.routeParamService.goToCompanyHome();
  }

  // 全従業員情報を取得
  private async loadAllEmployees() {
    try {
      this.allEmployees = await this.userService.getEmployees(this.companyId);
      // 退職者を除外
      this.allEmployees = this.allEmployees.filter(employee => employee.enrolmentData);
      this.updateAdminEmployees();  // 従業員情報を取得したら管理者一覧も更新
    } catch (error) {
      console.error('従業員一覧の取得に失敗しました:', error);
    }
  }

  // 管理者権限を持つ従業員の一覧を更新
  private updateAdminEmployees() {
    this.adminEmployees = this.allEmployees.filter(employee => {
      const employeeRoles = this.allEmployeeRoles[employee.employeeId] || [];
      return employeeRoles.some(role => 
        role.type === 'admin' && 
        !role.isDeleted
      );
    });
  }

  // 社員番号で検索
  async searchById() {
    const employeeId = this.searchForm.get('employeeId')?.value;
    if (!employeeId) return;
    this.isSearched = true;

    const employee = this.allEmployees.find(emp => emp.employeeId === employeeId);
    if (employee) {
      this.searchResults = [employee];
    } else {
      this.searchResults = [];
    }
  }

  // 社員名で検索
  async searchByName() {
    const employeeName = this.searchForm.get('employeeName')?.value;
    if (!employeeName) return;
    this.isSearched = true;

    this.searchResults = this.allEmployees.filter(emp => 
      emp.lastName.startsWith(employeeName) || emp.firstName.startsWith(employeeName) || emp.lastName + emp.firstName === employeeName
    );
  }

  // 社員属性で検索
  async searchByAttribute() {
    const attribute = this.searchForm.get('employeeAttribute')?.value;
    if (!attribute) return;
    this.isSearched = true;

    this.searchResults = this.allEmployees.filter(emp => 
      emp.employeeAttribute === attribute
    );
  }

  // 全従業員を表示ボタン
  async showAllEmployees() {
    this.isSearched = true;
    this.searchResults = [...this.allEmployees];
  }

  // 選択された従業員の処理
  selectEmployee(employee: EmployeeProfile) {
    this.selectedEmployee = employee;
    this.loadRoles(employee.employeeId);
  }

  // 権限情報を取得
  private async loadRoles(employeeId: string) {
    try {
      this.roles = await this.roleService.getRoles(this.companyId, employeeId);
    } catch (error) {
      console.error('権限情報の取得に失敗しました:', error);
    }
  }

  onSelectEmployee(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const selectedIndex = selectElement.selectedIndex;
    if (selectedIndex > 0) {
      const employee = this.searchResults[selectedIndex - 1];
        this.selectEmployee(employee);
    }
  }

  // 社員番号で検索リセット
  resetEmployeeId(): void {
    this.searchForm.get('employeeId')?.setValue('');
    this.searchResults = [];
    this.isSearched = false;
  }

  // 社員名で検索リセット
  resetEmployeeName(): void {
    this.searchForm.get('employeeName')?.setValue('');
    this.searchResults = [];
    this.isSearched = false;
  }

  // 社員属性で検索リセット
  resetEmployeeAttribute(): void {
    this.searchForm.get('employeeAttribute')?.setValue('');
    this.searchResults = [];
    this.isSearched = false;
  }

  // 権限の有無をチェックするメソッド
  hasRole(type: 'admin' | 'approver'): boolean {
    return this.roles.some(role => role.type === type && !role.isDeleted);
  }

  // 登録ボタンの有効/無効を判定するメソッド
  canRegister(): boolean {
    const hasAdmin = this.hasRole('admin');
    const hasApprover = this.hasRole('approver');

    // 管理者権限を持っていない場合
    if (!hasAdmin) {
      // 管理者権限の追加と承認者権限の追加を同時に行う場合も許可
      if (this.adminAction === 'add' && this.approverAction === 'add') {
        return true;
      }
      return this.adminAction === 'add';
    }

    // 管理者権限を持っていて、承認者権限を持っていない場合
    if (hasAdmin && !hasApprover) {
      if (this.adminAction === 'delete') {
        return this.approverAction === 'delete' || this.approverAction === null;
      }
      return true; // 管理者が選択なしの場合
    }

    // 管理者権限と承認者権限の両方を持っている場合
    if (this.adminAction === 'delete') {
      return this.approverAction === 'delete';
    }
    return this.approverAction === 'delete' || this.approverAction === null;
  }

  toggleApproverAction(action: 'add' | 'delete') {
    if (action === 'add') {
      // 管理者権限の有無をチェック
      const hasAdminRole = this.roles.some(role => role.type === 'admin' && !role.isDeleted);
      if (!hasAdminRole && this.adminAction !== 'add') {
        this.toastr.error('管理者権限がないと、承認者権限は付与できません');
        return;
      }
      // 管理者権限を削除する場合は許可しない
      if (this.adminAction === 'delete') {
        this.toastr.error('管理者権限を削除する場合は、承認者権限を追加できません');
        return;
      }
    }
    this.approverAction = this.approverAction === action ? null : action;
  }

  toggleAdminAction(action: 'add' | 'delete') {
    if (action === 'delete') {
      // 承認者権限の有無をチェック
      if (this.hasRole('approver')) {
        this.toastr.error('承認者権限を持っている場合、管理者権限を削除できません');
        return;
      }
      // 承認者権限の追加が選択されている場合は許可しない
      if (this.approverAction === 'add') {
        this.toastr.error('承認者権限を追加する場合は、管理者権限を削除できません');
        return;
      }
    } else if (action === 'add' && this.adminAction === 'add') {
      // 管理者の追加ボタンを解除する場合
      if (this.approverAction === 'add') {
        this.toastr.error('管理者権限がないと、承認者権限は付与できません');
        this.approverAction = null; // 承認者権限の追加も解除
      }
    }
    this.adminAction = this.adminAction === action ? null : action;
  }

  closeRoleForm() {
    this.selectedEmployee = null;
    this.roles = [];
    this.adminAction = null;
    this.approverAction = null;
    this.resetEmployeeId();
    this.resetEmployeeName();
    this.resetEmployeeAttribute();
  }

  async registerRole() {
    if (!this.selectedEmployee) return;
    this.isRegistering = true;

    try {
      // 管理者権限
      if (this.adminAction === 'add') {
        const role: Role = {
          type: 'admin',
          createdAt: new Date(),
          isDeleted: false
        };
        await this.roleService.addOrReviveRole(this.companyId, this.selectedEmployee.employeeId, role);
      } else if (this.adminAction === 'delete') {
        await this.roleService.deleteRole(this.companyId, this.selectedEmployee.employeeId, 'admin');
      }

      // 承認者権限
      if (this.approverAction === 'add') {
        const role: Role = {
          type: 'approver',
          createdAt: new Date(),
          isDeleted: false
        };
        await this.roleService.addOrReviveRole(this.companyId, this.selectedEmployee.employeeId, role);
      } else if (this.approverAction === 'delete') {
        await this.roleService.deleteRole(this.companyId, this.selectedEmployee.employeeId, 'approver');
      }

      // 更新後の状態を再取得
      await this.loadRoles(this.selectedEmployee.employeeId);
      this.toastr.success('権限情報を更新しました');
      this.closeRoleForm();
    } catch (error) {
      console.error('権限情報の更新に失敗しました:', error);
      this.toastr.error('権限情報の更新に失敗しました');
    } finally {
      this.isRegistering = false;
    }
  }

  // 従業員の権限情報を取得
  getEmployeeRoles(employeeId: string): Role[] {
    return this.allEmployeeRoles[employeeId] || [];
  }

  // 編集ボタンの処理
  editRole(employee: EmployeeProfile) {
    this.selectedEmployee = employee;
    this.loadRoles(employee.employeeId);
  }

  // 選択された従業員の権限情報を取得
  getSelectedEmployeeRoles(): Role[] {
    if (!this.selectedEmployee) return [];
    return this.allEmployeeRoles[this.selectedEmployee.employeeId] || [];
  }
}
