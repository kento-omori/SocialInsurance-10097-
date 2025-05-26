import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { RouteParamService } from '../../services/route-param.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-all-employee-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './all-employee-list.component.html',
  styleUrl: './all-employee-list.component.css'
})
export class AllEmployeeListComponent implements OnInit {
  private companyId: string | null = null;
  private employeeId: string | null = null;
  private routeSubscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private routeParamService: RouteParamService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.companyId = this.routeParamService.setCompanyId(this.route);
    this.employeeId = this.routeParamService.setEmployeeId(this.route);
  }

  goToAdminHome() {
    this.routeParamService.goToAdminHome();
  }

  goToViewSalary() {
    this.routeParamService.goToViewSalary();
  }

  goToStandardRemuneration() {
    this.routeParamService.goToStandardRemuneration();
  }

  goToPremiums() {
    this.routeParamService.goToPremiums();
  }
}
