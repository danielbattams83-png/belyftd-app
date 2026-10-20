import {Routes} from '@angular/router';
import {CourseUnitComponent} from './components/course-unit.component';
import {JoinComponent} from './components/join.component';
import {tierAccessGuard} from './guards/tier-access.guard';

export const routes: Routes = [
  {path: '', pathMatch: 'full'},
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
