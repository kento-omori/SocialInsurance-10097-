import { Injectable } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RouteParamService {
  private companyIdSubject = new BehaviorSubject<string>('');
  private employeeIdSubject = new BehaviorSubject<string>('');

  companyId$ = this.companyIdSubject.asObservable();
  employeeId$ = this.employeeIdSubject.asObservable();

  constructor(private router: Router) {}

  setCompanyId(route: ActivatedRoute | ActivatedRouteSnapshot) {
    const companyId = route instanceof ActivatedRoute 
      ? route.snapshot.paramMap.get('companyId') || ''
      : route.params['companyId'] || '';
    this.companyIdSubject.next(companyId);
    return companyId;
  }

  setEmployeeId(route: ActivatedRoute | ActivatedRouteSnapshot) {
    const employeeId = route instanceof ActivatedRoute
      ? route.snapshot.paramMap.get('employeeId') || ''
      : route.params['employeeId'] || '';
    this.employeeIdSubject.next(employeeId);
    return employeeId;
  }

  getCompanyId(): string {
    return this.companyIdSubject.value;
  }

  getEmployeeId(): string {
    return this.employeeIdSubject.value;
  }
  
  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  goToChangeEmail(): void {
    this.router.navigate(['/change-email']);
  }

  goToResetPass(): void {
    this.router.navigate(['/reset-pass']);
  }

  goToVerifyEmail(): void {
    this.router.navigate(['/verify-email']);
  }

  goToCompanyHome(): void {
    const companyId = this.getCompanyId();
    if (companyId) {
      this.router.navigate(['/companies', companyId, 'home']);
    }
  }

  goToOfficeList(): void {
    const companyId = this.getCompanyId();
    if (companyId) {
      this.router.navigate(['/companies', companyId, 'office-list']);
    }
  }

  goToRegisterEmployee(): void {
    const companyId = this.getCompanyId();
    if (companyId) {
      this.router.navigate(['/companies', companyId, 'register-employee']);
    }
  }

  goToRole(): void {
    const companyId = this.getCompanyId();
    if (companyId) {
      this.router.navigate(['/companies', companyId, 'role']);
    }
  }

  goToEmployeeHome(): void {
    const companyId = this.getCompanyId();
    const employeeId = this.getEmployeeId();
    console.log(companyId, employeeId);
    if (companyId && employeeId) {
      this.router.navigate(['/companies', companyId, 'employee-home', employeeId]);
    }
  }

  goToAuditLogCo(): void {
    const companyId = this.getCompanyId();
    if (companyId) {
      this.router.navigate(['/companies', companyId, 'audit-log-co']);
    }
  }

  // クエリパラメータ取得
  getQueryParam(route: ActivatedRoute | ActivatedRouteSnapshot, key: string): string | null {
    if (route instanceof ActivatedRoute) {
      return route.snapshot.queryParamMap.get(key);
    } else {
      return route.queryParams ? route.queryParams[key] || null : null;
    }
  }

  goToBasicInfo(): void {
    const companyId = this.getCompanyId();
    const employeeId = this.getEmployeeId();
    if (companyId && employeeId) {
      this.router.navigate(['/companies', companyId, 'employee-home', employeeId, 'basic-info']);
    }
  }

  goToAdminHome(): void {
    const companyId = this.getCompanyId();
    const employeeId = this.getEmployeeId();
    if (companyId && employeeId) {
      this.router.navigate(['/companies', companyId, 'admin-home', employeeId]);
    }
  }

  goToRegisterSalary(): void {
    const companyId = this.getCompanyId();
    const employeeId = this.getEmployeeId();
    if (companyId && employeeId) {
      this.router.navigate(['/companies', companyId, 'admin-home', employeeId, 'register-salary']);
    }
  }

  goToAllEmployeeList(): void {
    const companyId = this.getCompanyId();
    const employeeId = this.getEmployeeId();
    if (companyId && employeeId) {
      this.router.navigate(['/companies', companyId, 'admin-home', employeeId, 'all-employee-list']);
    }
  }

  goToViewSalary(): void {
    const companyId = this.getCompanyId();
    const employeeId = this.getEmployeeId();
    if (companyId && employeeId) {
      this.router.navigate(['/companies', companyId, 'admin-home', employeeId, 'view-salary']);
    }
  }

  goToStandardRemuneration(): void {
    const companyId = this.getCompanyId();
    const employeeId = this.getEmployeeId();
    if (companyId && employeeId) {
      this.router.navigate(['/companies', companyId, 'admin-home', employeeId, 'standard-remuneration']);
    }
  }

  goToPremiums(): void {
    const companyId = this.getCompanyId();
    const employeeId = this.getEmployeeId();
    if (companyId && employeeId) {
      this.router.navigate(['/companies', companyId, 'admin-home', employeeId, 'premiums']);
    }
  }
  

} 