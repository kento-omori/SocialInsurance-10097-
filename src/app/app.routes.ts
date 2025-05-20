import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './login/login/login.component';
import { VerifyEmailComponent } from './login/verify-email/verify-email.component';
import { HomeComponent } from './company/home/home.component';
import { EmployeeHomeComponent } from './employee/employee-home/employee-home.component';

export const routes: Routes = [
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'verify-email', component: VerifyEmailComponent },
    // 会社
    { path: 'companies/:companyId/home', component: HomeComponent, canActivate: [authGuard] },
    // 従業員
    { path: 'companies/:companyId/employee-home/:employeeId', component: EmployeeHomeComponent, canActivate: [authGuard] },
];
