import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { RouteParamService } from '../../services/route-param.service';
import { Pipe, PipeTransform } from '@angular/core';
import { SalaryInfo } from '../../interface/salary-info';
import { SalaryInfoService } from '../../services/salary-info.service';
import { Subscription } from 'rxjs';

@Pipe({
  name: 'jpy',
  standalone: true
})
export class JpyPipe implements PipeTransform {
  transform(value: number): string {
    if (value === null || value === undefined) return '';
    return `${value.toLocaleString('ja-JP')}`;
  }
}

@Component({
  selector: 'app-view-salary',
  standalone: true,
  imports: [JpyPipe, CommonModule],
  templateUrl: './view-salary.component.html',
  styleUrl: './view-salary.component.css'
})
export class ViewSalaryComponent implements OnInit, OnDestroy {
  private companyId: string | null = null;
  private employeeId: string | null = null;
  salaryInfoList: SalaryInfo[] | null = null;
  private salarySubscription: Subscription | null = null;
  private routeSubscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private routeParamService: RouteParamService,
    private route: ActivatedRoute,
    private salaryInfoService: SalaryInfoService
  ) {}

  ngOnInit() {
    this.companyId = this.routeParamService.setCompanyId(this.route);
    this.employeeId = this.routeParamService.setEmployeeId(this.route);
    
    if (this.companyId) {
      this.subscribeToSalaryInfo();
    }
  }

  ngOnDestroy() {
    // 全ての購読を解除
    if (this.salarySubscription) {
      this.salarySubscription.unsubscribe();
    }
    this.routeSubscriptions.forEach(sub => sub.unsubscribe());
  }

  // 給与情報の購読
  private subscribeToSalaryInfo() {
    if (this.salarySubscription) {
      this.salarySubscription.unsubscribe();
    }
    if (!this.companyId || !this.employeeId) return;

    this.salarySubscription = this.salaryInfoService.subscribeToAllSalaryInfo().subscribe({
      next: (salaryInfoList: SalaryInfo[]) => {
        this.salaryInfoList = salaryInfoList;
      },
      error: (error) => {
        console.error('給与情報の取得に失敗しました:', error);
        this.salaryInfoList = [];
      }
    });
  }

  goToAllEmployeeList() {
    this.routeParamService.goToAllEmployeeList();
  }

  goToAdminHome() {
    this.routeParamService.goToAdminHome();
  }
}
