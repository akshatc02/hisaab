import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';
import { getDb } from '@/lib/db';

async function requireAuth() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  return session.isLoggedIn ? null : Response.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth();
  if (auth) return auth;

  const db = await getDb();
  const batch = await db.prepare('SELECT * FROM ironing_batches WHERE id = ?').get(params.id);
  if (!batch) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json(batch);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth();
  if (auth) return auth;

  const db = await getDb();
  const batch = (await db.prepare('SELECT * FROM ironing_batches WHERE id = ?').get(params.id)) as
    | { id: number; status: string; sent_count: number }
    | undefined;

  if (!batch) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const { action } = body;

  if (action === 'receive') {
    if (batch.status !== 'PENDING') {
      return Response.json({ error: 'Only PENDING batches can be received' }, { status: 400 });
    }
    const { received_count, notes } = body;
    if (!received_count || received_count < 0) {
      return Response.json({ error: 'Received count must be 0 or more' }, { status: 400 });
    }

    const newStatus = received_count === batch.sent_count ? 'RECEIVED' : 'DISPUTED';
    await db.prepare(`
      UPDATE ironing_batches
      SET received_count = ?, received_date = ?, status = ?, notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(received_count, new Date().toISOString().split('T')[0], newStatus, notes || null, params.id);

    const updated = await db.prepare('SELECT * FROM ironing_batches WHERE id = ?').get(params.id);
    return Response.json(updated);
  }

  if (action === 'resolve') {
    if (batch.status !== 'DISPUTED') {
      return Response.json({ error: 'Only DISPUTED batches can be resolved' }, { status: 400 });
    }
    const { resolution_notes } = body;
    await db.prepare(`
      UPDATE ironing_batches SET status = 'RESOLVED', resolution_notes = ? WHERE id = ?
    `).run(resolution_notes || null, params.id);

    const updated = await db.prepare('SELECT * FROM ironing_batches WHERE id = ?').get(params.id);
    return Response.json(updated);
  }

  if (action === 'add_note') {
    const { notes } = body;
    await db.prepare('UPDATE ironing_batches SET notes = ? WHERE id = ?').run(notes, params.id);
    const updated = await db.prepare('SELECT * FROM ironing_batches WHERE id = ?').get(params.id);
    return Response.json(updated);
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
}
