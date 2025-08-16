import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin, combineLatest, map } from 'rxjs';
import { DataService } from './data.service';
import { SyncService } from './sync.service';
import { Site, Environment, Cluster, EnvironmentType, ClusterType } from './models';

@Injectable({ providedIn: 'root' })
export class SitesStateService {
  private readonly _localSite$   = new BehaviorSubject<Site | null>(null);
  private readonly _remoteSites$ = new BehaviorSubject<Map<number, Site>>(new Map());

  private readonly _envTypes$     = new BehaviorSubject<EnvironmentType[]>([]);
  private readonly _clusterTypes$ = new BehaviorSubject<ClusterType[]>([]);

  readonly localSite$   = this._localSite$.asObservable();
  readonly remoteSites$ = this._remoteSites$.asObservable();
  readonly environmentTypes$ = this._envTypes$.asObservable();
  readonly clusterTypes$     = this._clusterTypes$.asObservable();

  /** Array of all sites for dropdowns (local first, then remotes) */
  readonly allSites$ = combineLatest([this.localSite$, this.remoteSites$]).pipe(
    map(([local, remotes]) => {
      const out: Site[] = [];
      if (local) out.push(local);
      for (const s of remotes.values()) out.push(s);
      return out;
    })
  );

  constructor(private data: DataService, private sync: SyncService) {}

  /** Parallel GETs → aggregate → publish streams */
  loadAll(): void {
    forkJoin({
      sites: this.data.getSites(),
      envs: this.data.getEnvironments(),
      clusters: this.data.getClusters(),
      syncClusters: this.data.getSyncClusters(),
      envTypes: this.data.getEnvironmentTypes(),
      clusterTypes: this.data.getClusterTypes(),
    }).subscribe(({ sites, envs, clusters, syncClusters, envTypes, clusterTypes }) => {
      const local = this.sync.fetchLocalSiteData(sites, envs, clusters, syncClusters);
      const remotesArr = this.sync.fetchRemoteSitesData(sites, envs, clusters);

      this._localSite$.next(local);
      this._remoteSites$.next(new Map<number, Site>(remotesArr.map(s => [s.id, s])));

      this._envTypes$.next(envTypes);
      this._clusterTypes$.next(clusterTypes);
    });
  }

  /** Helpers for hierarchical dropdowns */
  getEnvironmentsForSite(siteId: number): Environment[] {
    const local = this._localSite$.value;
    if (local?.id === siteId) return Array.from(local.environments.values());
    const remote = this._remoteSites$.value.get(siteId);
    return remote ? Array.from(remote.environments.values()) : [];
  }

  getClustersForEnv(envId: number): Cluster[] {
    const local = this._localSite$.value;
    if (local) {
      for (const e of local.environments.values()) {
        if (e.id === envId) return Array.from(e.clusters.values());
      }
    }
    for (const site of this._remoteSites$.value.values()) {
      const env = site.environments.get(envId);
      if (env) return Array.from(env.clusters.values());
    }
    return [];
  }

  // -------- Mutations: POST → reload & re-aggregate --------
  addRemoteSite(payload: { name: string }) {
    this.data.createSite({ ...payload, physical_location: 'N' }).subscribe(() => this.loadAll());
  }
  addEnvironment(siteId: number, payload: { name: string; environmentTypeId: number }) {
    this.data.createEnvironment(siteId, { ...payload, siteId }).subscribe(() => this.loadAll());
  }
  addCluster(envId: number, payload: { name: string; clusterTypeId: number }) {
    this.data.createCluster(envId, { ...payload, envId }).subscribe(() => this.loadAll());
  }
  addSyncCluster(clusterId: number, payload: { name: string }) {
    this.data.createSyncCluster(clusterId, payload).subscribe(() => this.loadAll());
  }
}
