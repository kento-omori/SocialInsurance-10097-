import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  constructor(private router: Router) {}

  goToCompanyHome(companyId: string) {
    this.router.navigate([`/companies/${companyId}/home`]);
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  goToVerifyEmail() {
    this.router.navigate(['/verify-email']);
  }

  goToEmployeeHome(companyId: string, employeeId: string) {
    this.router.navigate([`/companies/${companyId}/employee-home/${employeeId}`]);
  }

  goToOfficeList(companyId: string) {
    this.router.navigate([`/companies/${companyId}/office-list`]);
  }
} 