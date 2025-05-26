import { Component } from '@angular/core';
import { RouteParamService } from '../../services/route-param.service';

@Component({
  selector: 'app-reset-pass',
  standalone: true,
  imports: [],
  templateUrl: './reset-pass.component.html',
  styleUrl: './reset-pass.component.css'
})
export class ResetPassComponent {

  constructor(private routeParamService: RouteParamService) {
  }

  goToLogin() {
    this.routeParamService.goToLogin();
  }
}
