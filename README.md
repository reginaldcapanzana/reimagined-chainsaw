Router hits your functional resolver → calls state.loadAll() and awaits the first hydrated state (either a local site or any remote sites).

SitesStateService fires parallel GETs (sites, envs, clusters, syncClusters, types). When they return, it uses SyncService to aggregate flat lists into:

localSite$ (the one with physical_location === 'Y', with SyncClusters attached under clusters)

remoteSites$ (a Map of all remotes, each with envs → clusters)

environmentTypes$ and clusterTypes$

Component A receives hydrated streams from state and renders:

AddForm (Component B) for creating Site / Environment / Cluster / SyncCluster

SitesDisplay (Component C) to show the current hierarchy

AddForm uses hierarchical dropdowns backed by state helpers:

Site → Environments (getEnvironmentsForSite)

Environment → Clusters (getClustersForEnv)

Type tables for Environment/Cluster creation

SyncCluster mode restricts site selection to Local site

On submit → call the correct SitesStateService mutation

Mutations POST to the backend, then reload all flat lists and re-aggregate to keep the UI perfectly in sync (simple and robust).
The display refreshes instantly via reactive streams.
