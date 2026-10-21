import {Routes} from '@angular/router';
import {CourseUnitComponent} from './components/course-unit.component';
import {JoinComponent} from './components/join.component';
import {tierAccessGuard} from './guards/tier-access.guard';

export const routes: Routes = [
  {path: '', pathMatch: 'full', children: []},
  {path: 'dashboard', pathMatch: 'full', children: []},
  {path: 'courses', pathMatch: 'full', children: []},
  {path: 'mentors', pathMatch: 'full', children: []},
  {path: 'quests', pathMatch: 'full', children: []},
  {path: 'coach-spark', pathMatch: 'full', children: []},
  {path: 'community', pathMatch: 'full', children: []},
  {path: 'partners', pathMatch: 'full', children: []},
  {path: 'profile', pathMatch: 'full', children: []},
  {path: 'settings', pathMatch: 'full', children: []},

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
