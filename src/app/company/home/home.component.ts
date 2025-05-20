import { Component, OnInit } from '@angular/core';
import { UserService } from '../../services/user.service';
import { NavigationService } from '../../services/navigation.service';
import { ActivatedRoute } from '@angular/router';

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
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    // ルートパラメータからcompanyIdを取得
    this.companyId = this.route.snapshot.paramMap.get('companyId') || '';

    // 会社情報を取得
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
}
