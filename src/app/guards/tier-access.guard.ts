import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {FirebaseService} from '../services/firebase.service';

export const tierAccessGuard: CanActivateFn = async (route) => {
  const firebaseService = inject(FirebaseService);
  const router = inject(Router);
  const moduleId = route.paramMap.get('moduleId');
  const unitId = route.paramMap.get('unitId');

  if (!moduleId || !unitId) return router.createUrlTree(['/']);
  await firebaseService.waitForAuthStateReady();
  if (!firebaseService.currentUser()) return router.createUrlTree(['/']);

  try {
    const subscriptionTier = await firebaseService.getCurrentSubscriptionTier();
    if (!subscriptionTier) return router.createUrlTree(['/courses']);

    const unit = await firebaseService.getModuleUnit(moduleId, unitId);
    return unit && subscriptionTier >= unit.minTier
      ? true
      : router.createUrlTree(['/courses']);
  } catch (error) {
    console.warn('[TierAccessGuard] Unable to verify course access:', error);
    return router.createUrlTree(['/courses']);
  }
};
