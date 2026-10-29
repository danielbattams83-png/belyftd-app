import {Routes} from '@angular/router';
import {CourseUnitComponent} from './components/course-unit.component';
import {JoinComponent} from './components/join.component';
import {tierAccessGuard} from './guards/tier-access.guard';
import {adminAuthGuard} from './guards/admin-auth.guard';
import {LegalPageComponent} from './components/legal-page.component';
import {SponsorAdminComponent} from './pages/admin/sponsor-admin/sponsor-admin.component';

export const routes: Routes = [
  {path: '', pathMatch: 'full', children: []},
  {path: 'dashboard', pathMatch: 'full', children: []},
  {path: 'courses', pathMatch: 'full', children: []},
  {path: 'mentors', pathMatch: 'full', children: []},
  {path: 'quests', pathMatch: 'full', children: []},
  {path: 'coach-spark', pathMatch: 'full', children: []},
  {path: 'community', pathMatch: 'full', children: []},
  {path: 'partners', pathMatch: 'full', children: []},
  {path: 'p/:slug', children: []},
  {path: 'profile', pathMatch: 'full', children: []},
  {path: 'settings', pathMatch: 'full', children: []},
  {path: 'privacy', component: LegalPageComponent, data: {page: 'privacy'}},
  {path: 'terms', component: LegalPageComponent, data: {page: 'terms'}},

  {path: 'admin/login', title: 'Super Admin Access | Lyft’d', loadComponent: () => import('./pages/admin/admin-login/admin-login.component').then(module => module.AdminLoginComponent)},
  {path: 'admin/content', title: 'Media CMS | Lyft’d', canActivate: [adminAuthGuard], loadComponent: () => import('./pages/admin/admin-content.component').then(module => module.AdminContentComponent)},
  {path: 'admin/sponsors', title: 'Partner Co-Branding | Lyft’d', component: SponsorAdminComponent, canActivate: [adminAuthGuard]},
  {path: 'join', component: JoinComponent},
  {
    path: 'courses/:moduleId/units/:unitId',
    component: CourseUnitComponent,
    canActivate: [tierAccessGuard],
  },
  {
    path: 'modules/:moduleId/units/:unitId',
    component: CourseUnitComponent,
    canActivate: [tierAccessGuard],
  },
  {path: '**', redirectTo: ''},
];
