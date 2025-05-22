import { Component, OnInit } from '@angular/core';
import { UserService } from '../../services/user.service';
import { NavigationService } from '../../services/navigation.service';
import { ActivatedRoute, Router } from '@angular/router';
import { RouteParamService } from '../../services/route-param.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  companyName: string = '';
  companyEmail: string = '';
  companyId: string = '';

  constructor(
    private userService: UserService,
    private navigationService: NavigationService,
    private route: ActivatedRoute,
    private routeParamService: RouteParamService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.companyId = this.routeParamService.setCompanyId(this.route);
    const company = await this.userService.getCompanyProfile(this.companyId);
    if (company) {
      this.companyName = company.companyName;
      this.companyEmail = company.companyEmail;
    }
  }

  logout() {
    this.navigationService.goToLogin();
  }

  goHome() {
    this.navigationService.goToCompanyHome(this.companyId);
  }

  goOfficeList() {
    this.router.navigate(['/companies', this.companyId, 'office-list']);
  }

  goRegisterEmployee() {
    this.router.navigate(['/companies', this.companyId, 'register-employee']);
  }
}
