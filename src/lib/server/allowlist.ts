import specification from '../../../docs/openapi.json';
const resources = new Set([
  'businesses',
  'drivers',
  'deliveries',
  'routes',
  'incidents',
  'financial-transactions',
  'audit',
  'fraud-flags',
  'privacy-requests',
]);
const uuid = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const routes = Object.entries(specification.paths)
  .filter(
    ([path]) =>
      !path.includes('/auth/') &&
      !path.includes('/webhooks/') &&
      !path.includes('/health') &&
      !/^\/api\/v1\/deliveries\/\{id\}\/(confirm|tracking)$/.test(path),
  )
  .map(([path, methods]) => ({
    pattern: new RegExp(
      '^' +
        path
          .replace('/api/v1', '')
          .replace(/\{resource\}/g, '([^/]+)')
          .replace(/\{[^}]+\}/g, uuid) +
        '$',
    ),
    methods: Object.keys(methods),
    resource: path.endsWith('/{resource}'),
  }));
export function allowedEndpoint(path: string, method: string) {
  if (path.includes('..') || path.includes('\\') || path.includes('%')) return false;
  return routes.some((route) => {
    const match = route.pattern.exec(path);
    return (
      !!match &&
      route.methods.includes(method.toLowerCase()) &&
      (!route.resource || resources.has(match[1]))
    );
  });
}
