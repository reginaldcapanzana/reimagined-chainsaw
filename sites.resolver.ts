import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { combineLatest, map, filter, take } from 'rxjs';
import { SitesStateService } from './sites-state.service';

export const sitesResolver: ResolveFn<boolean> = () => {
  const state = inject(SitesStateService);
  state.loadAll();

  return combineLatest([state.localSite$, state.remoteSites$]).pipe(
    filter(([local, remotes]) => !!local || remotes.size > 0),
    take(1),
    map(() => true)
  );
};
