import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { UserService } from '../services/user.service';

export const companyGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const userService = inject(UserService);

//   const companyId = route.params['companyId'];

//   if (!companyId) {
//     router.navigate(['/login']);
//     return false;
//   }

//   const companyProfile = await userService.getCompanyProfile(companyId);

//   if (!companyProfile || companyProfile.companyEmail !== auth.currentUser?.email) {
//     router.navigate(['/login']);
//     return false;
//   }
  return true;
}; 