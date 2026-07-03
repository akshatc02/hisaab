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
  const rows = (await db.prepare('SELECT key, value FROM settings').all()) as { key: string; value: string }[];
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return Response.json(settings);
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (auth) return auth;

  const body = await request.json();
  const db = await getDb();

  const allowed = ['ironing_rate', 'milk_rate'];
  const update = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

  for (const key of allowed) {
    if (body[key] !== undefined) {
      const val = parseFloat(body[key]);
      if (isNaN(val) || val < 0) {
        return Response.json({ error: `${key} must be a non-negative number` }, { status: 400 });
      }
      await update.run(key, String(val));
    }
  }

  const rows = (await db.prepare('SELECT key, value FROM settings').all()) as { key: string; value: string }[];
  return Response.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
}
