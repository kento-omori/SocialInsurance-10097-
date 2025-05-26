import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '../../services/user.service';
import { RouteParamService } from '../../services/route-param.service';
import { EmployeeProfile, Role } from '../../interface/employee-company-profile';

@Component({
  selector: 'app-employee-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './employee-home.component.html',
  styleUrl: './employee-home.component.css'
})
export class EmployeeHomeComponent implements OnInit {

  employeeProfile: EmployeeProfile | null = null;
  companyId: string = '';
  employeeId: string = '';
  employeeName: string = '';
  employeeEmail: string = '';
  companyName: string = '';
  roles: Role[] = [];

  constructor(
    private route: ActivatedRoute, 
    private userService: UserService,
    private routeParamService: RouteParamService
  ) {}

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

  goToEmployeeHome() {
    this.routeParamService.goToEmployeeHome();
  }

  goToLogin() {
    this.routeParamService.goToLogin();
  }

  goToChangeEmail() {
    this.routeParamService.goToChangeEmail();
  }

  goToBasicInfo() {
    this.routeParamService.goToBasicInfo();
  }

  goToAdminHome() {
    this.routeParamService.goToAdminHome();
  }
}
