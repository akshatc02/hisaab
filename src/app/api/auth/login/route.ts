import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return Response.json({ error: 'Username and password required' }, { status: 400 });
    }

    const db = await getDb();
    const user = (await db.prepare('SELECT * FROM users WHERE username = ?').get(username)) as
      | { id: number; username: string; password_hash: string }
      | undefined;

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const session = await getIronSession<SessionData>(cookies(), sessionOptions);
    session.isLoggedIn = true;
    session.user = { username: user.username };
    await session.save();

    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
