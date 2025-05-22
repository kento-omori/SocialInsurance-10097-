import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { companyGuard } from './guards/company.guard';
import { employeeGuard } from './guards/employee.guard';
import { LoginComponent } from './login/login/login.component';
import { VerifyEmailComponent } from './login/verify-email/verify-email.component';
import { HomeComponent } from './company/home/home.component';
import { EmployeeHomeComponent } from './employee/employee-home/employee-home.component';
import { OfficeListComponent } from './company/office-list/office-list.component';
import { RegisterEmployeeComponent } from './company/register-employee/register-employee.component';

export const routes: Routes = [
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'verify-email', component: VerifyEmailComponent },
    
    // 会社関連のルート
    { path: 'companies/:companyId/home', component: HomeComponent, 
        // canActivate: [authGuard, companyGuard] 
    },
    { path: 'companies/:companyId/office-list', component: OfficeListComponent, 
        // canActivate: [authGuard, companyGuard]
    },
    { path: 'companies/:companyId/register-employee', component: RegisterEmployeeComponent, 
        // canActivate: [authGuard, companyGuard]
    },

    // 従業員関連のルート
    {
        path: 'companies/:companyId/employee-home/:employeeId',
        component: EmployeeHomeComponent,
        // canActivate: [authGuard, employeeGuard]
    }
];
