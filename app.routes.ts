import { Routes } from '@angular/router';
import { ComponentA } from './component-a.component';
import { sitesResolver } from './sites.resolver';

export const routes: Routes = [
  {
    path: '',
    component: ComponentA,
    resolve: { hydrated: sitesResolver },
    // runGuardsAndResolvers: 'paramsOrQueryParamsChange', // optional
  },
];
