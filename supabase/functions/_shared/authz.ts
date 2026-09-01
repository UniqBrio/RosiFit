import { adminClient } from './db.ts';
import { HttpError } from './response.ts';

export type CallerAppUser = {
  id: string;
  kind: 'super_admin' | 'staff';
  name: string;
  is_active: boolean;
};

/**
 * Every authenticated-only function runs as service_role, so PostgREST/RLS
 * is not what protects it -- this is. It resolves the caller's app_user row
 * from the bearer JWT the client sent, exactly the way RLS policies do via
 * current_app_user_id(), just done by hand because this code IS service_role.
 */
export async function requireCaller(req: Request): Promise<CallerAppUser> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) throw new HttpError(401, 'Sign in required.');

  const admin = adminClient();
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) throw new HttpError(401, 'Your session has expired. Sign in again.');

  const { data: appUser, error } = await admin
    .from('app_users')
    .select('id, kind, name, is_active')
    .eq('auth_user_id', userData.user.id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new HttpError(500, 'Could not resolve the signed-in account.');
  if (!appUser || !appUser.is_active) throw new HttpError(403, 'This account is not active.');
  return appUser as CallerAppUser;
}

export async function requireSuperAdmin(req: Request): Promise<CallerAppUser> {
  const caller = await requireCaller(req);
  if (caller.kind !== 'super_admin') throw new HttpError(403, 'Only the academy admin can do this.');
  return caller;
}
