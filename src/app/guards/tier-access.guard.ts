import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {canAccessModule, TierService} from '../services/tier.service';
import {FirebaseService} from '../services/firebase.service';

export const tierAccessGuard: CanActivateFn = async (route) => {
  const firebaseService = inject(FirebaseService);
  const router = inject(Router);
  const tiers = inject(TierService);
  const moduleId = route.paramMap.get('moduleId');
  const unitId = route.paramMap.get('unitId');

  if (!moduleId || !unitId) return router.createUrlTree(['/']);
  await firebaseService.waitForAuthStateReady();


  try {
    const subscriptionTier = await firebaseService.getCurrentSubscriptionTier();
    if (!canAccessModule(subscriptionTier, moduleId)) {
      tiers.requestUpgrade(moduleId);
      return false;
    }
    const unit = await firebaseService.getModuleUnit(moduleId, unitId);
    return unit ? true : router.createUrlTree(['/courses']);
  } catch (error) {
    console.warn('[TierAccessGuard] Unable to verify course access:', error);
    return router.createUrlTree(['/courses']);
  }
};
