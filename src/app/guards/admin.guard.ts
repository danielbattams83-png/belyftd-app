import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {FirebaseService} from '../services/firebase.service';

export const adminGuard: CanActivateFn = async () => {
  const firebase = inject(FirebaseService);
  const router = inject(Router);
  await firebase.waitForAuthStateReady();
  const user = firebase.currentUser();
  const profile = firebase.userProfile();
  return user && (profile?.role === 'admin' || (await user.getIdTokenResult()).claims['isAdmin'] === true)
    ? true
    : router.createUrlTree(['/dashboard']);
};
