import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { RouteParamService } from '../../services/route-param.service';
import { CompanyService } from '../../services/company.service';
import { RoleService } from '../../services/role.service';
import { EmployeeProfile, Role } from '../../interface/employee-company-profile';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-admin-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-home.component.html',
  styleUrl: './admin-home.component.css'
})
export class AdminHomeComponent implements OnInit {

  employeeProfile: EmployeeProfile | null = null;
  companyId: string = '';
  companyName: string = '';
  employeeName: string = '';
  employeeId: string = '';
  employeeEmail: string = '';
  employeeRole: string = '';
  roles: Role[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private routeParamService: RouteParamService,
    private companyService: CompanyService,
    private roleService: RoleService,
    private userService: UserService
  ) {
  }

  async ngOnInit() {
    this.companyId = this.routeParamService.setCompanyId(this.route);
    this.employeeId = this.routeParamService.setEmployeeId(this.route);
    this.employeeProfile = await this.userService.getEmployeeProfile(this.companyId, this.employeeId);
    if (this.employeeProfile) {
      this.employeeName = this.employeeProfile.employeeName;
      this.employeeId = this.employeeProfile.employeeId;
      this.employeeEmail = this.employeeProfile.employeeEmail || '';
      this.companyName = this.employeeProfile.companyName;
      this.roles = this.employeeProfile.roles || [];
    }
  }

  // 有効な権限を取得　→　管理者画面ボタンの表示判定のために必要
  get activeRoles() {
    return (this.roles || []).filter(role => !role.isDeleted);
  }
  // 管理者権限を確認　→　管理者画面ボタンの表示判定のため
  get isAdmin() {
    return this.activeRoles.some(role => role.type === 'admin');
  }

  goToLogin() {
    this.routeParamService.goToLogin();
  }

  goToEmployeeHome() {
    this.routeParamService.goToEmployeeHome();
  }

  goToAdminHome() {
    this.routeParamService.goToAdminHome();
  }

  goToRegisterSalary() {
    this.routeParamService.goToRegisterSalary();
  }

  goToAllEmployeeList() {
    this.routeParamService.goToAllEmployeeList();
  }

}
