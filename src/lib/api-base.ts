/**
 * API base resolution for LeadG.
 *
 * Why: in production LeadG is mounted under a path prefix (/leadg/ via the
 * nginx reverse proxy). Root-absolute fetch('/api/...') calls resolve to the
 * DOMAIN root — which is the main CRM, not this app — so every client-side
 * API call 404'd in production. apiUrl() prefixes our mount path at runtime
 * (derived from window.location) so fetches reach OUR routes. Local dev (app
 * at /) resolves to plain /api/... as before.
 */

const APP_PREFIXES = ['/leadg', '/foreclosure', '/contentplanner', '/media-workflow', '/legacyleads'];

function detectBase(): string {
  if (typeof window === 'undefined') return '';
  const m = APP_PREFIXES.find((p) => window.location.pathname === p || window.location.pathname.startsWith(p + '/'));
  return m || '';
}

/** Build a fetch URL for one of our API routes, prefix-aware in production. */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${detectBase()}${p}`;
}
