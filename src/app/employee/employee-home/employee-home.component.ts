import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavigationService } from '../../services/navigation.service';
import { UserService, EmployeeProfile } from '../../services/user.service';

@Component({
  selector: 'app-employee-home',
  standalone: true,
  imports: [],
  templateUrl: './employee-home.component.html',
  styleUrl: './employee-home.component.css'
})
export class EmployeeHomeComponent {
  companyId: string = '';
  employeeId: string = '';
  employeeName: string = '';
  employeeEmail: string = '';

  constructor(private navigationService: NavigationService, private route: ActivatedRoute, private userService: UserService) {
  }

  ngOnInit() {
    this.companyId = this.route.snapshot.params['companyId'];
    this.employeeId = this.route.snapshot.params['employeeId'];
    console.log(this.companyId, this.employeeId);
    this.userService.getEmployeeProfile(this.companyId, this.employeeId).then((employeeProfile) => {
      this.employeeName = employeeProfile?.employeeName || '';
      this.employeeId = employeeProfile?.employeeId || '';
      this.employeeEmail = employeeProfile?.employeeEmail || '';
    });
  }

  goToEmployeeHome() {
    this.navigationService.goToEmployeeHome(this.companyId, this.employeeId);
  }

  goToLogin() {
    this.navigationService.goToLogin();
  }


}
