import { NextRequest } from 'next/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const COOKIE_NAME = 'feetsball_admin_session';

/**
 * Returns true if the request carries a valid admin credential.
 * Accepts either:
 *  - An `x-admin-password` header (for programmatic/legacy access)
 *  - The `feetsball_admin_session` HttpOnly cookie (set by /api/admin/verify)
 */
export function isAuthorized(req: NextRequest): boolean {
  if (!ADMIN_PASSWORD) return false;

  const headerVal = req.headers.get('x-admin-password') ?? '';
  if (headerVal === ADMIN_PASSWORD) return true;

  const cookieVal = req.cookies.get(COOKIE_NAME)?.value ?? '';
  return cookieVal === ADMIN_PASSWORD;
}
