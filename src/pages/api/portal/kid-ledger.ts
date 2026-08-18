export const prerender = false;
import type { APIRoute } from 'astro';
import { requireStaff } from '../../../lib/portalPerms';
import {
  listLedger, getKidBalance, listAllBalances, createLedgerEntry, deleteLedgerEntry,
} from '../../../lib/portalKidLedger';

function j(x: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(x), { headers: { 'Content-Type': 'application/json' }, ...init });
}

export const GET: APIRoute = async ({ locals, url }) => {
  const auth = requireStaff(locals);
  if (auth instanceof Response) return auth;
  const action = url.searchParams.get('action');
  try {
    if (action === 'list') {
      const kidId = url.searchParams.get('kid_id');
      const limit = Math.min(500, Number(url.searchParams.get('limit') || 200));
      return j({ ok: true, items: await listLedger(kidId ? Number(kidId) : undefined, limit) });
    }
    if (action === 'balance') {
      const kidId = Number(url.searchParams.get('kid_id'));
      if (!kidId) return j({ ok: false, error: 'kid_id required' }, { status: 400 });
      return j({ ok: true, ...(await getKidBalance(kidId)) });
    }
    if (action === 'balances') {
      return j({ ok: true, items: await listAllBalances() });
    }
    return j({ ok: false, error: 'unknown action' }, { status: 400 });
  } catch (e: any) {
    return j({ ok: false, error: 'server-error', detail: e?.message }, { status: 500 });
  }
};

export const POST: APIRoute = async ({ locals, request }) => {
  const auth = requireStaff(locals);
  if (auth instanceof Response) return auth;
  const { role, sub } = auth;

  try {
    const body = await request.json().catch(() => ({} as any));
    const action = String(body.action || '');

    if (action === 'add') {
      const kidId = Number(body.kid_id);
      const amount = Number(body.amount);
      const reason = String(body.reason || '').trim();
      if (!kidId) return j({ ok: false, error: 'kid_id required' }, { status: 400 });
      if (!Number.isInteger(amount) || amount === 0) {
        return j({ ok: false, error: 'amount must be a non-zero integer' }, { status: 400 });
      }
      if (!reason) return j({ ok: false, error: 'reason required' }, { status: 400 });

      const source = body.source === 'daily_allowance' ? 'daily_allowance' : 'manual';
      const shiftDayNumber = body.shift_day_number ? Number(body.shift_day_number) : null;
      if (source === 'daily_allowance' && !shiftDayNumber) {
        return j({ ok: false, error: 'shift_day_number required for daily_allowance' }, { status: 400 });
      }

      try {
        const id = await createLedgerEntry({
          kid_id: kidId,
          kid_name: body.kid_name?.toString() || null,
          amount,
          reason,
          source,
          shift_day_number: shiftDayNumber,
          issued_by: String(sub ?? role),
        });
        return j({ ok: true, id });
      } catch (e: any) {
        if (e?.code === '23505') {
          return j({ ok: false, error: 'already-credited', detail: 'daily_allowance уже начислена за этот день' }, { status: 409 });
        }
        throw e;
      }
    }

    if (action === 'delete') {
      const id = Number(body.id);
      if (!id) return j({ ok: false, error: 'id required' }, { status: 400 });
      await deleteLedgerEntry(id);
      return j({ ok: true });
    }

    return j({ ok: false, error: 'unknown action' }, { status: 400 });
  } catch (e: any) {
    return j({ ok: false, error: 'server-error', detail: e?.message }, { status: 500 });
  }
};
