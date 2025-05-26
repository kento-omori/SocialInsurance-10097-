import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { RouteParamService } from '../../services/route-param.service';
import { JpyPipe } from '../view-salary/view-salary.component';
import { StandardRemuneration } from '../../interface/standard-remuneration';

@Component({
  selector: 'app-standard-remuneration',
  standalone: true,
  imports: [CommonModule, JpyPipe],
  templateUrl: './standard-remuneration.component.html',
  styleUrl: './standard-remuneration.component.css'
})
export class StandardRemunerationComponent {
  private companyId: string | null = null;
  private employeeId: string | null = null;
  standardRemunerationList: StandardRemuneration[] | null = null;

  constructor(
    private router: Router,
    private routeParamService: RouteParamService,
    private route: ActivatedRoute,
  ) {
    this.standardRemunerationList = this.getStandardRemunerationList();
  }

  ngOnInit() {
    this.companyId = this.routeParamService.setCompanyId(this.route);
    this.employeeId = this.routeParamService.setEmployeeId(this.route);
  }

  ngOnDestroy() {
  }

  goToAllEmployeeList() {
    this.routeParamService.goToAllEmployeeList();
  }

  goToAdminHome() {
    this.routeParamService.goToAdminHome();
  }

  getStandardRemunerationList() {
    return [
      {
        companyId: '1',                 
        companyName: '会社名',              
        employeeId: '10002',                
        employeeName: '山田　孝之',             
        employeeAttribute: '正社員',        
        qualification: '健保・厚生',            
        standardRemuneration: 220000,     
        standardRemunerationGrade: '20',  
        standardRemunerationDate: '2024-07',  
        healthInsuranceRate: 0.1,       
        careInsuranceRate: 0.01,         
        pensionInsuranceRate: 0.1,      
        childEducationRate: 0.01,       
      }
    ]
  }
}
