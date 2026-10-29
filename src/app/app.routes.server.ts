import {RenderMode, ServerRoute} from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {path: 'admin/**', renderMode: RenderMode.Client},
  {
    path: 'p/:slug',
    renderMode: RenderMode.Client,
  },
  {
    path: 'join',
    renderMode: RenderMode.Client,
  },
  {
    path: 'courses/:moduleId/units/:unitId',
    renderMode: RenderMode.Client,
  },
  {
    path: 'modules/:moduleId/units/:unitId',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
