import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';
import { getDb } from '@/lib/db';

async function requireAuth() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  return session.isLoggedIn ? null : Response.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET() {
  const auth = await requireAuth();
  if (auth) return auth;

  const db = await getDb();
  const batches = await db.prepare(`
    SELECT * FROM ironing_batches
    ORDER BY
      CASE status WHEN 'PENDING' THEN 0 WHEN 'DISPUTED' THEN 1 WHEN 'RESOLVED' THEN 2 ELSE 3 END,
      sent_date DESC
  `).all();

  return Response.json(batches);
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth) return auth;

  const { sent_date, sent_count, notes } = await request.json();

  if (!sent_date || !sent_count || sent_count < 1) {
    return Response.json({ error: 'Date and piece count required (minimum 1)' }, { status: 400 });
  }

  const db = await getDb();

  const pending = await db.prepare("SELECT id FROM ironing_batches WHERE status = 'PENDING'").get();
  if (pending) {
    return Response.json(
      { error: 'A batch is already pending. Receive it before sending new clothes.' },
      { status: 409 }
    );
  }

  const result = await db.prepare(`
    INSERT INTO ironing_batches (sent_date, sent_count, notes, status)
    VALUES (?, ?, ?, 'PENDING')
  `).run(sent_date, sent_count, notes || null);

  const batch = await db.prepare('SELECT * FROM ironing_batches WHERE id = ?').get(result.lastInsertRowid!);
  return Response.json(batch, { status: 201 });
}
