import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';
import { getDb } from '@/lib/db';

async function requireAuth() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  return session.isLoggedIn ? null : Response.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth) return auth;

  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year');
  const month = searchParams.get('month');

  const db = await getDb();

  if (year && month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const entries = await db.prepare(`
      SELECT * FROM milk_log WHERE date LIKE ? ORDER BY date ASC, session ASC
    `).all(`${prefix}%`);
    return Response.json(entries);
  }

  const entries = await db.prepare('SELECT * FROM milk_log ORDER BY date DESC, session ASC').all();
  return Response.json(entries);
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth) return auth;

  const { date, session: timeSession, quantity, notes, vendor } = await request.json();

  if (!date || !timeSession || quantity === undefined || quantity === null) {
    return Response.json({ error: 'Date, session, and quantity are required' }, { status: 400 });
  }
  if (quantity < 0) {
    return Response.json({ error: 'Quantity cannot be negative' }, { status: 400 });
  }
  if (!['morning', 'evening'].includes(timeSession)) {
    return Response.json({ error: 'Session must be morning or evening' }, { status: 400 });
  }

  const db = await getDb();
  const vendorName = vendor || 'default';

  const existing = (await db.prepare(`
    SELECT id FROM milk_log WHERE date = ? AND session = ? AND vendor = ?
  `).get(date, timeSession, vendorName)) as { id: number } | undefined;

  if (existing) {
    await db.prepare('UPDATE milk_log SET quantity = ?, notes = ? WHERE id = ?').run(
      quantity, notes || null, existing.id
    );
    const updated = await db.prepare('SELECT * FROM milk_log WHERE id = ?').get(existing.id);
    return Response.json(updated);
  }

  const result = await db.prepare(`
    INSERT INTO milk_log (date, session, quantity, vendor, notes) VALUES (?, ?, ?, ?, ?)
  `).run(date, timeSession, quantity, vendorName, notes || null);

  const entry = await db.prepare('SELECT * FROM milk_log WHERE id = ?').get(result.lastInsertRowid!);
  return Response.json(entry, { status: 201 });
}
