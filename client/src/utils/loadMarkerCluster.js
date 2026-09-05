import L from "leaflet";

// leaflet.markercluster is a UMD plugin that attaches L.MarkerClusterGroup to
// a *global* L rather than importing it — a static `import "leaflet.markercluster"`
// isn't guaranteed to run after `L` is set up on window (bundler/ESM evaluation
// order isn't specified for that). A dynamic import after `window.L = L` makes
// the ordering explicit and correct; loaded once and cached for the app's life,
// shared by every map view that needs clustering.
let clusterPluginPromise = null;
export function loadClusterPlugin() {
  if (!clusterPluginPromise) {
    window.L = L;
    clusterPluginPromise = import("leaflet.markercluster");
  }
  return clusterPluginPromise;
}
