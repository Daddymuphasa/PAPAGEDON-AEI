// Deploy base path: the app is served under /meta (papagedon.com/meta in
// production, http://localhost:3000/meta in dev). Mirrors `basePath` in
// next.config.mjs. Plain <a> links and fetch() calls do not pick up basePath
// automatically, so route them through withBasePath.
export const BASE_PATH = '/meta';

export function withBasePath(path: string): string {
  return `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
}
