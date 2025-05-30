import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { companyGuard } from './guards/company.guard';
import { employeeGuard } from './guards/employee.guard';
import { LoginComponent } from './login/login/login.component';
import { RegisterComponent } from './login/register/register.component';
import { ResetPassComponent } from './login/reset-pass/reset-pass.component';
import { VerifyEmailComponent } from './login/verify-email/verify-email.component';
import { HomeComponent } from './company/home/home.component';
import { EmployeeHomeComponent } from './employee/employee-home/employee-home.component';
import { OfficeListComponent } from './company/office-list/office-list.component';
import { RegisterEmployeeComponent } from './company/register-employee/register-employee.component';
import { RoleComponent } from './company/role/role.component';
import { AuditLogCoComponent } from './company/audit-log-co/audit-log-co.component';
import { ChangeEmailComponent } from './login/change-email/change-email.component';
import { BasicInfoComponent } from './employee/basic-info/basic-info.component';
import { AdminHomeComponent } from './admin/admin-home/admin-home.component';
import { RegisterSalaryComponent } from './admin/register-salary/register-salary.component';
import { AllEmployeeListComponent } from './admin/all-employee-list/all-employee-list.component';
import { ViewSalaryComponent } from './admin/view-salary/view-salary.component';
import { StandardRemunerationComponent } from './admin/standard-remuneration/standard-remuneration.component';
import { PremiumsComponent } from './admin/premiums/premiums.component';
import { StandardBonusAmountComponent } from './admin/standard-bonus-amount/standard-bonus-amount.component';

export const routes: Routes = [
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'verify-email', component: VerifyEmailComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'reset-pass', component: ResetPassComponent },
    

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
    { path: 'companies/:companyId/role', component: RoleComponent, 
        // canActivate: [authGuard, companyGuard]
    },
    { path: 'companies/:companyId/audit-log-co', component: AuditLogCoComponent, 
        // canActivate: [authGuard, companyGuard]
    },

    // 従業員関連のルート
    { path: 'companies/:companyId/employee-home/:employeeId', component: EmployeeHomeComponent,
        // canActivate: [authGuard, employeeGuard]
    },
    { path: 'companies/:companyId/employee-home/:employeeId/basic-info', component: BasicInfoComponent,
        // canActivate: [authGuard, employeeGuard]
    },

    // 管理者関連のルート
    { path: 'companies/:companyId/admin-home/:employeeId', component: AdminHomeComponent,
        // canActivate: [authGuard, adminGuard]
    },
    { path: 'companies/:companyId/admin-home/:employeeId/register-salary', component: RegisterSalaryComponent,
        // canActivate: [authGuard, adminGuard]
    },
    { path: 'companies/:companyId/admin-home/:employeeId/view-salary', component: ViewSalaryComponent,
        // canActivate: [authGuard, adminGuard]
    },
    { path: 'companies/:companyId/admin-home/:employeeId/all-employee-list', component: AllEmployeeListComponent,
        // canActivate: [authGuard, adminGuard]
    },
    { path: 'companies/:companyId/admin-home/:employeeId/standard-remuneration', component: StandardRemunerationComponent,
        // canActivate: [authGuard, adminGuard]
    },
    { path: 'companies/:companyId/admin-home/:employeeId/premiums', component: PremiumsComponent,
        // canActivate: [authGuard, adminGuard]
    },
    { path: 'companies/:companyId/admin-home/:employeeId/standard-bonus-amount', component: StandardBonusAmountComponent,
        // canActivate: [authGuard, adminGuard]
    },


    // メールアドレス変更関連のルート
    // { path: 'change-email', component: ChangeEmailComponent,
    //     canActivate: [authGuard]
    // },
];
