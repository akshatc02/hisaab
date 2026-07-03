import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';
import { getDb } from '@/lib/db';

async function requireAuth() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  return session.isLoggedIn ? null : Response.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth();
  if (auth) return auth;

  const db = await getDb();
  const entry = await db.prepare('SELECT * FROM milk_log WHERE id = ?').get(params.id);
  if (!entry) return Response.json({ error: 'Not found' }, { status: 404 });

  const { quantity, notes } = await request.json();
  if (quantity === undefined || quantity < 0) {
    return Response.json({ error: 'Quantity must be 0 or more' }, { status: 400 });
  }

  await db.prepare('UPDATE milk_log SET quantity = ?, notes = ? WHERE id = ?').run(
    quantity, notes ?? null, params.id
  );
  const updated = await db.prepare('SELECT * FROM milk_log WHERE id = ?').get(params.id);
  return Response.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth();
  if (auth) return auth;

  const db = await getDb();
  const result = await db.prepare('DELETE FROM milk_log WHERE id = ?').run(params.id);
  if (result.changes === 0) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json({ ok: true });
}
