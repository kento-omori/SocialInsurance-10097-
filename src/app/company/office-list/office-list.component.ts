import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '../../services/user.service';
import { NavigationService } from '../../services/navigation.service';
import { RouteParamService } from '../../services/route-param.service';
import { OfficeFormComponent } from '../office-form/office-form.component';
import { Office } from '../office.interface';
import { CompanyService } from '../../services/company.service';

@Component({
  selector: 'app-office-list',
  standalone: true,
  imports: [CommonModule, OfficeFormComponent],
  templateUrl: './office-list.component.html',
  styleUrl: './office-list.component.css'
})
export class OfficeListComponent implements OnInit {
  companyId: string = '';
  companyName: string = '';
  showForm: boolean = false;
  offices: Office[] = [];
  selectedOffice: Office | null = null;
  isViewMode: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private navigationService: NavigationService,
    private routeParamService: RouteParamService,
    private companyService: CompanyService
  ) {}

  async ngOnInit() {
    this.companyId = this.routeParamService.setCompanyId(this.route);
    if (!this.companyId) {
      console.error('会社IDが取得できませんでした');
      return;
    }
    this.companyService.setCompanyId(this.companyId);
    const company = await this.userService.getCompanyProfile(this.companyId);
    if (company) {
      this.companyName = company.companyName;
    }
    await this.loadOffices();
  }

  async loadOffices() {
    try {
      const offices = await this.companyService.getOffices();
      this.offices = offices.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        console.log('Sorting:', {
          officeA: a.officeName,
          dateA: dateA,
          officeB: b.officeName,
          dateB: dateB
        });
        return dateA.getTime() - dateB.getTime();
      });
    } catch (error) {
      console.error('事業所情報の取得に失敗しました:', error);
    }
  }

  goHome() {
    this.navigationService.goToCompanyHome(this.companyId);
  }

  async onOfficeSelected(office: Office) {
    if (this.selectedOffice?.id === office.id) {
      return;
    }
    
    if (!this.showForm) {
      this.showForm = true;
    }
    
    this.selectedOffice = office;
    this.isViewMode = true;
  }

  onOfficeAdded(office: Office) {
    this.loadOffices();
    this.showForm = false;
    this.selectedOffice = null;
    this.isViewMode = false;
  }

  onOfficeUpdated(office: Office) {
    this.loadOffices();
    this.showForm = false;
    this.selectedOffice = null;
    this.isViewMode = false;
  }

  onOfficeDeleted(office: Office) {
    this.loadOffices();
    this.showForm = false;
    this.selectedOffice = null;
    this.isViewMode = false;
  }

  closeForm() {
    this.showForm = false;
    this.selectedOffice = null;
    this.isViewMode = false;
  }

  onEdit(office: Office): void {
    this.isViewMode = false;
    this.selectedOffice = office;
  }

  onDelete(office: Office): void {
    // TODO: 削除処理の実装
    console.log('Delete office:', office);
  }
}
