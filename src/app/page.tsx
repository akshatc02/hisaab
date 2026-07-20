'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { AlertTriangle, Clock, CheckCircle, Plus, LogOut } from 'lucide-react';

interface IroningBatch {
  id: number;
  sent_date: string;
  sent_count: number;
  status: string;
  notes?: string;
}

interface MilkEntry {
  id: number;
  date: string;
  session: string;
  quantity: number;
}

function daysSince(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - d.getTime()) / 86400000);
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function DashboardPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<IroningBatch[]>([]);
  const [todayMilk, setTodayMilk] = useState<MilkEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [ironRes, milkRes] = await Promise.all([
        fetch('/api/ironing'),
        fetch(`/api/milk?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`),
      ]);

      if (ironRes.status === 401 || milkRes.status === 401) {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        return;
      }

      const allBatches: IroningBatch[] = await ironRes.json();
      const allMilk: MilkEntry[] = await milkRes.json();
      const today = todayStr();

      setBatches(allBatches.filter((b) => b.status === 'PENDING' || b.status === 'DISPUTED'));
      setTodayMilk(allMilk.filter((m) => m.date === today));
      setLoading(false);
    }
    load();
  }, [router]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const pending = batches.filter((b) => b.status === 'PENDING');
  const disputed = batches.filter((b) => b.status === 'DISPUTED');
  const morning = todayMilk.find((m) => m.session === 'morning');
  const evening = todayMilk.find((m) => m.session === 'evening');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between sticky top-0 z-40">
        <h1 className="text-xl font-bold text-gray-900">Hisaab</h1>
        <button onClick={logout} className="p-2 text-gray-500 active:text-gray-700">
          <LogOut size={20} />
        </button>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Disputed alert */}
        {disputed.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className="text-red-500" />
              <span className="font-semibold text-red-700">
                {disputed.length} Disputed {disputed.length === 1 ? 'Batch' : 'Batches'}
              </span>
            </div>
            <div className="space-y-1">
              {disputed.map((b) => (
                <Link
                  key={b.id}
                  href={`/ironing/${b.id}`}
                  className="block text-sm text-red-600 underline"
                >
                  {b.sent_date} — Sent {b.sent_count} pieces
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Ironing card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 text-lg">Ironing</h2>
            <Link
              href="/ironing/new"
              className={`flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-xl transition-colors ${
                pending.length > 0
                  ? 'bg-gray-100 text-gray-400 pointer-events-none'
                  : 'bg-blue-600 text-white active:bg-blue-700'
              }`}
            >
              <Plus size={14} />
              New Batch
            </Link>
          </div>

          {pending.length === 0 ? (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle size={16} />
              <span>No pending batches</span>
            </div>
          ) : (
            <div className="space-y-2">
              {pending.map((b) => (
                <Link
                  key={b.id}
                  href={`/ironing/${b.id}`}
                  className="flex items-center justify-between bg-yellow-50 rounded-xl p-3 active:bg-yellow-100"
                >
                  <div>
                    <p className="font-medium text-gray-900">{b.sent_count} pieces</p>
                    <p className="text-xs text-gray-500">{b.sent_date}</p>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-700 text-xs font-medium">
                    <Clock size={13} />
                    {daysSince(b.sent_date)}d ago
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Milk card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 text-lg">Milk Today</h2>
            <Link
              href="/milk"
              className="text-sm font-medium text-blue-600 active:text-blue-800"
            >
              View All
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Morning */}
            <Link href="/milk" className="bg-blue-50 rounded-xl p-3 block active:bg-blue-100">
              <p className="text-xs text-gray-500 mb-1">Morning</p>
              {morning ? (
                <p className="font-bold text-xl text-blue-700">{morning.quantity}L</p>
              ) : (
                <p className="text-sm text-gray-400 font-medium">Not logged</p>
              )}
            </Link>
            {/* Evening */}
            <Link href="/milk" className="bg-indigo-50 rounded-xl p-3 block active:bg-indigo-100">
              <p className="text-xs text-gray-500 mb-1">Evening</p>
              {evening ? (
                <p className="font-bold text-xl text-indigo-700">{evening.quantity}L</p>
              ) : (
                <p className="text-sm text-gray-400 font-medium">Not logged</p>
              )}
            </Link>
          </div>

          {(!morning || !evening) && (
            <Link
              href="/milk"
              className="mt-3 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold active:bg-blue-700"
            >
              <Plus size={16} />
              Log Milk
            </Link>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/billing"
            className="bg-white border border-gray-200 rounded-2xl p-4 text-center active:bg-gray-50"
          >
            <p className="text-2xl mb-1">🧾</p>
            <p className="text-sm font-medium text-gray-700">Monthly Bill</p>
          </Link>
          <Link
            href="/ironing"
            className="bg-white border border-gray-200 rounded-2xl p-4 text-center active:bg-gray-50"
          >
            <p className="text-2xl mb-1">👕</p>
            <p className="text-sm font-medium text-gray-700">Ironing History</p>
          </Link>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
