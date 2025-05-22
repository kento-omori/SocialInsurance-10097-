import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { UserService } from '../services/user.service';
import { RouteParamService } from '../services/route-param.service';

export const employeeGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const userService = inject(UserService);
  const routeParamService = inject(RouteParamService);

  const companyId = routeParamService.setCompanyId(route);
  const employeeId = routeParamService.setEmployeeId(route);
  const employeeProfile = await userService.getEmployeeProfile(companyId, employeeId);

  if (!employeeProfile || employeeProfile.employeeEmail !== auth.currentUser?.email) {
    router.navigate(['/login']);
    return false;
  }

  return true;
}; 