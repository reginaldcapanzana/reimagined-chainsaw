import { Injectable } from '@angular/core';
import { Site, Environment, Cluster, SyncCluster } from './models';

@Injectable({ providedIn: 'root' })
export class SyncService {
  fetchLocalSiteData(
    sites: any[], envs: any[], clusters: any[], syncClusters: any[]
  ): Site | null {
    const localSiteRaw = sites.find((s: any) => s.physical_location === 'Y');
    if (!localSiteRaw) return null;
    return this.aggregateLocalSiteData(localSiteRaw, envs, clusters, syncClusters);
  }

  fetchRemoteSitesData(
    sites: any[], envs: any[], clusters: any[]
  ): Site[] {
    const remoteSitesRaw = sites.filter((s: any) => s.physical_location === 'N');
    return this.aggregateRemoteSitesData(remoteSitesRaw, envs, clusters);
  }

  private aggregateLocalSiteData(
    siteRaw: any, envs: any[], clusters: any[], syncClusters: any[]
  ): Site {
    const envsForSite = envs.filter((e: any) => e.site_id === siteRaw.id);
    const envMap = new Map<number, Environment>();
    for (const e of envsForSite) {
      envMap.set(e.id, {
        id: e.id, name: e.name, siteId: e.site_id, environmentTypeId: e.environment_type_id,
        clusters: new Map<number, Cluster>(),
      });
    }

    for (const c of clusters) {
      const env = envMap.get(c.env_id);
      if (!env) continue;
      env.clusters.set(c.id, {
        id: c.id, name: c.name, envId: c.env_id, clusterTypeId: c.cluster_type_id,
      });
    }

    for (const sc of syncClusters) {
      const clusterId = sc.send_id;
      for (const env of envMap.values()) {
        const cl = env.clusters.get(clusterId);
        if (cl) {
          if (!cl.syncClusters) cl.syncClusters = new Map<number, SyncCluster>();
          cl.syncClusters.set(sc.id, { id: sc.id, clusterId, name: sc.name });
          break;
        }
      }
    }

    return {
      id: siteRaw.id, name: siteRaw.name,
      physical_location: 'Y', type: 'local',
      environments: envMap,
    };
  }

  private aggregateRemoteSitesData(
    remoteSitesRaw: any[], envs: any[], clusters: any[]
  ): Site[] {
    const envsBySite = new Map<number, any[]>();
    for (const e of envs) {
      const list = envsBySite.get(e.site_id) ?? [];
      list.push(e); envsBySite.set(e.site_id, list);
    }

    const clustersByEnv = new Map<number, any[]>();
    for (const c of clusters) {
      const list = clustersByEnv.get(c.env_id) ?? [];
      list.push(c); clustersByEnv.set(c.env_id, list);
    }

    const results: Site[] = [];
    for (const s of remoteSitesRaw) {
      const envArr = envsBySite.get(s.id) ?? [];
      const envMap = new Map<number, Environment>();

      for (const e of envArr) {
        const clArr = clustersByEnv.get(e.id) ?? [];
        const clMap = new Map<number, Cluster>(clArr.map((c: any) => [c.id, {
          id: c.id, name: c.name, envId: c.env_id, clusterTypeId: c.cluster_type_id,
        }]));

        envMap.set(e.id, {
          id: e.id, name: e.name, siteId: e.site_id, environmentTypeId: e.environment_type_id,
          clusters: clMap,
        });
      }

      results.push({
        id: s.id, name: s.name, physical_location: 'N', type: 'remote',
        environments: envMap,
      });
    }

    return results;
  }
}
