import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';
import { ActivatedRoute } from '@angular/router';
import { RouteParamService } from '../../services/route-param.service';
import { CompanyService } from '../../services/company.service';
import { RoleService } from '../../services/role.service';
import { Subscription } from 'rxjs';
import { Office } from '../../interface/office.interface';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  companyName: string = '';
  companyEmail: string = '';
  companyId: string = '';
  officeList: Office[] = [];
  adminCount: number = 0;
  approverCount: number = 0;
  employeeCount: number = 0;
  private subscription: Subscription | null = null;
  private roleSubscription: Subscription | null = null;

  constructor(
    private userService: UserService,
    private route: ActivatedRoute,
    private routeParamService: RouteParamService,
    private companyService: CompanyService,
    private roleService: RoleService,
  ) {}

  async ngOnInit() {
    this.companyId = this.routeParamService.setCompanyId(this.route);
    if (!this.companyId) {
      console.error('会社IDが設定されていません');
      return;
    }

    const company = await this.userService.getCompanyProfile(this.companyId);
    if (company) {
      this.companyName = company.companyName;
      this.companyEmail = company.companyEmail;
    }
    this.companyService.setCompanyId(this.companyId);
    this.subscription = this.companyService.subscribeToOffices().subscribe(offices => {
      this.officeList = offices;
    });

    this.roleSubscription = this.roleService.subscribeToRoles(this.companyId).subscribe(roles => {
      const counts = this.roleService.calculateRoleCounts(roles);
      this.adminCount = counts.adminCount;
      this.approverCount = counts.approverCount;
      this.employeeCount = Object.keys(roles).length;
    });
  }
  

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.roleSubscription) {
      this.roleSubscription.unsubscribe();
    }
  }

  logout() {
    this.routeParamService.goToLogin();
  }

  goHome() {
    this.routeParamService.goToCompanyHome();
  }

  goOfficeList() {
    this.routeParamService.goToOfficeList();
  }

  goToRegisterEmployee() {
    this.routeParamService.goToRegisterEmployee();
  }

  goToRole() {
    this.routeParamService.goToRole();
  }

  goToAuditLogCo() {
    this.routeParamService.goToAuditLogCo();
  }

  goToChangeEmail() {
    this.routeParamService.goToChangeEmail();
  }
}
