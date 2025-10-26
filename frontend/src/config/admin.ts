const ADMIN_EMAIL_PREFIX = 'admin';

export const hasAdminAccess = (email?: string | null): boolean =>
  (email ?? '').trim().toLowerCase().startsWith(ADMIN_EMAIL_PREFIX);
