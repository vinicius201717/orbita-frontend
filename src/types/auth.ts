export type Role = 'ADMIN' | 'BUSINESS_OWNER' | 'BUSINESS_STAFF' | 'DRIVER';
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  businessId: string | null;
  driverId: string | null;
  phone?: string | null;
}
export interface SessionState {
  user: SessionUser | null;
}
