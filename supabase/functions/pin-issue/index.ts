// pin-issue: super-admin-only. Creates a new staff account with her first
// PIN, or regenerates one for an existing account (the "Generate PIN" /
// "Regenerate" / "Re-enable" actions on the staff list), or removes an
// account and its credential (the bin on that same list). The PIN appears
// once, in this response, and nowhere else -- never logged, never stored
// readable, never in an audit row.
//
// Every one of those is the same act with a different verb -- the super admin
// deciding who may sign in -- so they share one authorisation check and one
// audit path rather than four functions drifting apart. `create_only`,
// `reactivate_only` and `delete_only` name which.
import { handlePreflight } from '../_shared/cors.ts';
import { json, errorJson, HttpError } from '../_shared/response.ts';
import { adminClient } from '../_shared/db.ts';
import { requireSuperAdmin } from '../_shared/authz.ts';
import { toE164India } from '../_shared/phone.ts';
import { generatePin } from '../_shared/pin.ts';
import { createAuthIdentity, rotatePin, signOutEverywhere } from '../_shared/identity.ts';

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Use POST.');
    const caller = await requireSuperAdmin(req);
    const body = await req.json().catch(() => ({}));
    const admin = adminClient();
    const pin = generatePin();

    const existingId: string | undefined = body.app_user_id;

    if (existingId) {
      const { data: existing, error: findErr } = await admin
        .from('app_users').select('id, name, kind, phone_e164, auth_user_id, is_active')
        .eq('id', existingId).is('deleted_at', null).maybeSingle();
      if (findErr) throw new HttpError(500, 'Could not look up that staff member.');
      if (!existing) throw new HttpError(404, 'Staff member not found.');

      /**
       * Removing a staff member from the list.
       *
       * A SOFT DELETE, and not for want of nerve. Every table in this schema
       * attributes its rows to the person who wrote them -- members.created_by,
       * sessions.created_by, attendance_records.uploaded_by and corrected_by,
       * audit_logs.actor_app_user_id, imports.imported_by -- and none of those
       * foreign keys carries an ON DELETE. A hard delete of a coach who has
       * ever taken a register is refused by the database, and the only way to
       * make it succeed would be to destroy the academy's own attendance
       * history along with her. So `deleted_at` is set: she leaves the staff
       * list, her number is freed by the partial unique index for whoever
       * replaces her, and the registers she took stay attributed.
       *
       * The credential is what actually gets destroyed. Her shadow GoTrue
       * user is unlinked and deleted, so the PIN stops working immediately
       * rather than at the next read of a flag -- a row hidden from one query
       * is a screen change, not a revocation.
       *
       * Two people it refuses: herself, and the super admin. Deleting the one
       * account that can create accounts leaves an academy nobody can
       * administer, and `one_super_admin` is a partial unique index -- the row
       * would be gone and unrecoverable from inside the app.
       */
      if (body.delete_only) {
        if (existingId === caller.id) {
          throw new HttpError(400, 'You cannot remove your own account.');
        }
        if (existing.kind === 'super_admin') {
          throw new HttpError(400, 'The academy admin account cannot be removed.');
        }

        // Credential first. If the row were hidden first and this failed, she
        // would be off the screen and still able to sign in -- the one order
        // of these two steps that cannot leave a live PIN behind.
        if (existing.auth_user_id) {
          await signOutEverywhere(existing.auth_user_id as string);
          // auth_user_id references auth.users ON DELETE RESTRICT, so the
          // link has to be dropped before the GoTrue user can go.
          const { error: unlinkErr } = await admin.from('app_users')
            .update({ auth_user_id: null }).eq('id', existingId);
          if (unlinkErr) throw new HttpError(500, 'Could not remove that staff member.');
          const { error: authErr } = await admin.auth.admin
            .deleteUser(existing.auth_user_id as string);
          // Non-fatal: the link is already cut, so nothing can authenticate as
          // her either way. An orphaned GoTrue row is untidy, not a way in.
          if (authErr) console.error('pin-issue could not delete the GoTrue user:', authErr.message);
        }

        const { error: delErr } = await admin.from('app_users')
          .update({
            deleted_at: new Date().toISOString(), is_active: false,
            must_change_pin: true, pin_set_at: null,
            failed_attempts: 0, locked_until: null,
          })
          .eq('id', existingId).is('deleted_at', null);
        if (delErr) throw new HttpError(500, 'Could not remove that staff member.');

        // Her open ask for a PIN is about an account that no longer exists.
        // Left open it sits in the admin's tray forever, naming nobody.
        const { error: closeErr } = await admin
          .from('pin_reset_requests')
          .update({ resolved_at: new Date().toISOString(), resolved_by: caller.id })
          .eq('app_user_id', existingId).is('resolved_at', null);
        if (closeErr) console.error('pin-issue could not close the request:', closeErr.message);

        await admin.rpc('audit_log_as', {
          p_actor: caller.id,
          p_action: 'auth.staff_deleted', p_entity_type: 'app_user', p_entity_id: existingId,
          p_metadata: { by: caller.id, name: existing.name, access_revoked: true },
        });

        return json({ app_user_id: existingId, deleted: true, name: existing.name });
      }

      // Re-enabling is not the same as issuing a PIN, and the staff list says
      // so: a re-enabled account goes back to "needs a PIN" rather than
      // silently getting one she has not been told. is_active is one of the
      // columns guard_app_users() refuses from PostgREST, so it can only
      // move through here.
      if (body.reactivate_only) {
        const { error: onErr } = await admin.from('app_users')
          .update({ is_active: true, failed_attempts: 0, locked_until: null })
          .eq('id', existingId);
        if (onErr) throw new HttpError(500, 'Could not re-enable that staff member.');
        // Attributed (0023). The actor was already in the metadata as `by`,
        // which is not the same thing: the audit table's own actor column is
        // what the log renders and what an entity query filters on, so an
        // entry findable only by reading its metadata blob is not attributed.
        await admin.rpc('audit_log_as', {
          p_actor: caller.id,
          p_action: 'auth.staff_reenabled', p_entity_type: 'app_user', p_entity_id: existingId,
          p_metadata: { by: caller.id },
        });
        return json({ app_user_id: existingId, reactivated: true });
      }

      const patch: Record<string, unknown> = {
        must_change_pin: true, pin_set_at: new Date().toISOString(),
        failed_attempts: 0, locked_until: null,
      };
      if (body.reactivate) patch.is_active = true;
      if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim();
      if (typeof body.role_label === 'string' && body.role_label.trim()) patch.role_label = body.role_label.trim();
      if (typeof body.phone === 'string' && body.phone.trim()) {
        const e164 = toE164India(body.phone);
        if (!e164) throw new HttpError(400, 'Enter a valid 10-digit mobile number.');
        if (e164 !== existing.phone_e164) {
          const { count } = await admin.from('app_users').select('id', { count: 'exact', head: true })
            .eq('phone_e164', e164).is('deleted_at', null);
          if (count && count > 0) throw new HttpError(409, 'This mobile number is already registered.');
          patch.phone_e164 = e164;
        }
      }

      const { error: updErr } = await admin.from('app_users').update(patch).eq('id', existingId);
      if (updErr) throw new HttpError(500, 'Could not update that staff member.');

      await rotatePin(admin, existingId, existing.auth_user_id, pin);

      // She has a new PIN, so any open ask for one is answered (0034). The
      // same close as pin-reset's, and it is here as well because the staff
      // list routes to THIS function whenever her access is not yet 'active'
      // -- one call site carrying the guard and its twin not carrying it is
      // how a tray entry outlives the thing it was about.
      const { error: closeErr } = await admin
        .from('pin_reset_requests')
        .update({ resolved_at: new Date().toISOString(), resolved_by: caller.id })
        .eq('app_user_id', existingId)
        .is('resolved_at', null);
      if (closeErr) console.error('pin-issue could not close the request:', closeErr.message);

      await admin.rpc('audit_log_as', {
        p_actor: caller.id,
        p_action: 'auth.pin_issued', p_entity_type: 'app_user', p_entity_id: existingId,
        p_metadata: { mode: 'regenerate', issued_by: caller.id },
      });

      return json({ app_user_id: existingId, phone_e164: patch.phone_e164 ?? existing.phone_e164, pin });
    }

    const name = String(body.name ?? '').trim();
    const e164 = toE164India(String(body.phone ?? ''));
    const roleLabel = String(body.role_label ?? '').trim();
    if (name.length < 2 || name.length > 80) throw new HttpError(400, 'Enter a name.');
    if (!e164) throw new HttpError(400, 'Enter a valid 10-digit mobile number.');
    if (!roleLabel) throw new HttpError(400, 'Choose a role.');

    const { count } = await admin.from('app_users').select('id', { count: 'exact', head: true })
      .eq('phone_e164', e164).is('deleted_at', null);
    if (count && count > 0) throw new HttpError(409, 'This mobile number is already registered.');

    // Adding a person and giving her a login are two steps on purpose. With
    // create_only the record exists and reads as "Not enabled" (pin_set_at
    // stays null, no shadow GoTrue user yet); the PIN is issued later from
    // the staff list, which is a named, deliberate act.
    const createOnly = Boolean(body.create_only);

    const { data: inserted, error: insertErr } = await admin.from('app_users').insert({
      kind: 'staff', name, phone_e164: e164, role_label: roleLabel,
      must_change_pin: true, pin_set_at: createOnly ? null : new Date().toISOString(),
      created_by: caller.id,
    }).select('id').single();
    if (insertErr || !inserted) throw new HttpError(500, 'Could not create the staff account.');

    if (createOnly) {
      await admin.rpc('audit_log_as', {
        p_actor: caller.id,
        p_action: 'auth.staff_created', p_entity_type: 'app_user', p_entity_id: inserted.id,
        p_metadata: { by: caller.id, access: 'not_enabled' },
      });
      return json({ app_user_id: inserted.id, phone_e164: e164, access: 'not_enabled' });
    }

    try {
      await createAuthIdentity(admin, inserted.id, pin);
    } catch (err) {
      await admin.from('app_users').delete().eq('id', inserted.id);
      throw err;
    }

    await admin.rpc('audit_log_as', {
      p_actor: caller.id,
      p_action: 'auth.pin_issued', p_entity_type: 'app_user', p_entity_id: inserted.id,
      p_metadata: { mode: 'create', issued_by: caller.id },
    });

    return json({ app_user_id: inserted.id, phone_e164: e164, pin });
  } catch (err) {
    return errorJson(err);
  }
});
