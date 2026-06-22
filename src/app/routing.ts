export type AppRoute = 'app' | 'landing';

export function withBasePath(pathname: string, basePath: string): string {
  const normalizedBase = normalizeBasePath(basePath);
  const normalizedPath = pathname.startsWith('/') ? pathname.slice(1) : pathname;

  if (normalizedPath === '') return normalizedBase;
  return `${normalizedBase}${normalizedPath}`;
}

export function getAppRoute(pathname: string, basePath: string): AppRoute {
  const relativePath = stripBasePath(pathname, basePath);
  return relativePath === 'landing' || relativePath.startsWith('landing/') ? 'landing' : 'app';
}

function stripBasePath(pathname: string, basePath: string): string {
  const normalizedBase = normalizeBasePath(basePath);
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;

  if (normalizedBase === '/') return normalizedPath.slice(1);
  if (normalizedPath === normalizedBase.slice(0, -1)) return '';
  if (normalizedPath.startsWith(normalizedBase)) return normalizedPath.slice(normalizedBase.length);

  return normalizedPath.slice(1);
}

function normalizeBasePath(basePath: string): string {
  if (!basePath || basePath === './') return '/';
  const withLeadingSlash = basePath.startsWith('/') ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}
