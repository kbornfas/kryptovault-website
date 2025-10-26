export const SUPER_ADMIN_EMAIL = 'admin@kryptovault.local';

export const isSuperAdmin = (email?: string | null): boolean =>
  (email ?? '').toLowerCase() === SUPER_ADMIN_EMAIL;
