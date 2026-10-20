import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {FirebaseService} from '../services/firebase.service';

export const TierAccessGuard: CanActivateFn = async (route) => {
  const firebaseService = inject(FirebaseService);
  const router = inject(Router);
  const moduleId = route.paramMap.get('moduleId');
  const unitId = route.paramMap.get('unitId');
  const user = firebaseService.currentUser();

  if (!moduleId || !unitId || !user) return router.createUrlTree(['/']);

  const unit = await firebaseService.getCourseUnit(moduleId, unitId);
  const subscriptionTier = firebaseService.userProfile()?.subscriptionTier ?? 1;

  return unit && subscriptionTier >= unit.minTier
    ? true
    : router.createUrlTree(['/courses']);
};
