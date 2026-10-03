import type { Role } from '@/types/auth';
export function homeForRole(role: Role) {
  return role === 'ADMIN' ? '/admin' : role === 'DRIVER' ? '/app/entregador' : '/app';
}
export function canAccess(role: Role, path: string) {
  if (path.startsWith('/admin')) return role === 'ADMIN';
  if (path.startsWith('/app/entregador')) return role === 'DRIVER';
  if (path.startsWith('/app')) return role === 'BUSINESS_OWNER' || role === 'BUSINESS_STAFF';
  return true;
}
