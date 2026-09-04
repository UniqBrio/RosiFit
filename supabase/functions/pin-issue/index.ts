// pin-issue: super-admin-only. Creates a new staff account with her first
// PIN, or regenerates one for an existing account (the "Generate PIN" /
// "Regenerate" / "Re-enable" actions on the staff list). The PIN appears
// once, in this response, and nowhere else -- never logged, never stored
// readable, never in an audit row.
import { handlePreflight } from '../_shared/cors.ts';
import { json, errorJson, HttpError } from '../_shared/response.ts';
import { adminClient } from '../_shared/db.ts';
import { requireSuperAdmin } from '../_shared/authz.ts';
import { toE164India } from '../_shared/phone.ts';
import { generatePin } from '../_shared/pin.ts';
import { createAuthIdentity, rotatePin } from '../_shared/identity.ts';

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
        .from('app_users').select('id, phone_e164, auth_user_id, is_active')
        .eq('id', existingId).is('deleted_at', null).maybeSingle();
      if (findErr) throw new HttpError(500, 'Could not look up that staff member.');
      if (!existing) throw new HttpError(404, 'Staff member not found.');

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
    if (name.length < 2 || name.length > 80) throw new HttpError(400, 'Enter her name.');
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
