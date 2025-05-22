import { Injectable } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RouteParamService {
  private companyIdSubject = new BehaviorSubject<string>('');
  private employeeIdSubject = new BehaviorSubject<string>('');

  companyId$ = this.companyIdSubject.asObservable();
  employeeId$ = this.employeeIdSubject.asObservable();

  constructor() {}

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
} 