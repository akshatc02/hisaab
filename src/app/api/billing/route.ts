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
  const year = parseInt(searchParams.get('year') || `${new Date().getFullYear()}`);
  const month = parseInt(searchParams.get('month') || `${new Date().getMonth() + 1}`);

  const db = await getDb();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;

  // Ironing: only RECEIVED batches in this month
  const ironingRows = (await db.prepare(`
    SELECT COALESCE(SUM(received_count), 0) as total
    FROM ironing_batches
    WHERE status = 'RECEIVED' AND received_date LIKE ?
  `).get(`${prefix}%`)) as { total: number };

  // Pending/disputed ironing batches in this month
  const ironingPending = (await db.prepare(`
    SELECT COUNT(*) as count FROM ironing_batches
    WHERE status IN ('PENDING', 'DISPUTED') AND sent_date LIKE ?
  `).get(`${prefix}%`)) as { count: number };

  // Milk: sum all quantities in this month
  const milkRows = (await db.prepare(`
    SELECT COALESCE(SUM(quantity), 0) as total FROM milk_log WHERE date LIKE ?
  `).get(`${prefix}%`)) as { total: number };

  // Rates
  const ironingRate = parseFloat(
    ((await db.prepare("SELECT value FROM settings WHERE key = 'ironing_rate'").get()) as { value: string })?.value || '0'
  );
  const milkRate = parseFloat(
    ((await db.prepare("SELECT value FROM settings WHERE key = 'milk_rate'").get()) as { value: string })?.value || '0'
  );

  // Settlements
  const ironingSettlement = await db.prepare(`
    SELECT * FROM monthly_settlements WHERE year = ? AND month = ? AND service = 'ironing'
  `).get(year, month);
  const milkSettlement = await db.prepare(`
    SELECT * FROM monthly_settlements WHERE year = ? AND month = ? AND service = 'milk'
  `).get(year, month);

  return Response.json({
    year,
    month,
    ironing: {
      total_pieces: ironingRows.total,
      pending_batches: ironingPending.count,
      rate: ironingRate,
      amount: ironingRows.total * ironingRate,
      settlement: ironingSettlement || null,
    },
    milk: {
      total_liters: milkRows.total,
      rate: milkRate,
      amount: milkRows.total * milkRate,
      settlement: milkSettlement || null,
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth) return auth;

  const { year, month, service, notes } = await request.json();

  if (!year || !month || !service) {
    return Response.json({ error: 'year, month, and service required' }, { status: 400 });
  }

  const db = await getDb();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;

  let total_quantity = 0;
  let rate = 0;

  if (service === 'ironing') {
    const row = (await db.prepare(`
      SELECT COALESCE(SUM(received_count), 0) as total FROM ironing_batches
      WHERE status = 'RECEIVED' AND received_date LIKE ?
    `).get(`${prefix}%`)) as { total: number };
    total_quantity = row.total;
    rate = parseFloat(
      ((await db.prepare("SELECT value FROM settings WHERE key = 'ironing_rate'").get()) as { value: string })?.value || '0'
    );
  } else if (service === 'milk') {
    const row = (await db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) as total FROM milk_log WHERE date LIKE ?
    `).get(`${prefix}%`)) as { total: number };
    total_quantity = row.total;
    rate = parseFloat(
      ((await db.prepare("SELECT value FROM settings WHERE key = 'milk_rate'").get()) as { value: string })?.value || '0'
    );
  }

  const amount = total_quantity * rate;
  const today = new Date().toISOString().split('T')[0];

  await db.prepare(`
    INSERT INTO monthly_settlements (year, month, service, total_quantity, rate, amount, settled, settled_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(year, month, service) DO UPDATE SET
      total_quantity = excluded.total_quantity,
      rate = excluded.rate,
      amount = excluded.amount,
      settled = 1,
      settled_date = excluded.settled_date,
      notes = excluded.notes
  `).run(year, month, service, total_quantity, rate, amount, today, notes || null);

  const settlement = await db.prepare(`
    SELECT * FROM monthly_settlements WHERE year = ? AND month = ? AND service = ?
  `).get(year, month, service);

  return Response.json(settlement);
}
