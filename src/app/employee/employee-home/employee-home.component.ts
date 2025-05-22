import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavigationService } from '../../services/navigation.service';
import { UserService, EmployeeProfile } from '../../services/user.service';
import { RouteParamService } from '../../services/route-param.service';

@Component({
  selector: 'app-employee-home',
  standalone: true,
  imports: [],
  templateUrl: './employee-home.component.html',
  styleUrl: './employee-home.component.css'
})
export class EmployeeHomeComponent implements OnInit {
  companyId: string = '';
  employeeId: string = '';
  employeeName: string = '';
  employeeEmail: string = '';
  companyName: string = '';

  constructor(
    private navigationService: NavigationService,
    private route: ActivatedRoute, 
    private userService: UserService,
    private routeParamService: RouteParamService
  ) {}

  async ngOnInit() {
    this.companyId = this.routeParamService.setCompanyId(this.route);
    this.employeeId = this.routeParamService.setEmployeeId(this.route);
    const employeeProfile = await this.userService.getEmployeeProfile(this.companyId, this.employeeId);
    if (employeeProfile) {
      this.employeeName = employeeProfile.employeeName;
      this.employeeId = employeeProfile.employeeId;
      this.employeeEmail = employeeProfile.employeeEmail || '';
      this.companyName = employeeProfile.companyName;
    }
  }

  goToEmployeeHome() {
    this.navigationService.goToEmployeeHome(this.companyId, this.employeeId);
  }

  goToLogin() {
    this.navigationService.goToLogin();
  }
}
