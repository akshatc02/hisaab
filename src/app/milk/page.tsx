'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { ArrowLeft, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface MilkEntry {
  id: number;
  date: string;
  session: string;
  quantity: number;
  notes?: string;
}

type DayData = {
  morning?: MilkEntry;
  evening?: MilkEntry;
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

type ModalState = {
  date: string;
  session: 'morning' | 'evening';
  existing?: MilkEntry;
} | null;

export default function MilkPage() {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [entries, setEntries] = useState<MilkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/milk?year=${year}&month=${month}`);
    if (res.status === 401) { router.push('/login'); return; }
    setEntries(await res.json());
    setLoading(false);
  }, [year, month, router]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  const today = todayStr();
  const totalDays = daysInMonth(year, month);
  const dayMap: Record<string, DayData> = {};

  for (const e of entries) {
    if (!dayMap[e.date]) dayMap[e.date] = {};
    if (e.session === 'morning') dayMap[e.date].morning = e;
    if (e.session === 'evening') dayMap[e.date].evening = e;
  }

  const totalMorning = entries.filter(e => e.session === 'morning').reduce((s, e) => s + e.quantity, 0);
  const totalEvening = entries.filter(e => e.session === 'evening').reduce((s, e) => s + e.quantity, 0);

  const days = Array.from({ length: totalDays }, (_, i) => {
    const d = i + 1;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return { d, dateStr, data: dayMap[dateStr] || {} };
  }).reverse();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-2 sticky top-0 z-40">
        <Link href="/" className="p-1 text-gray-500"><ArrowLeft size={20} /></Link>
        <h1 className="text-xl font-bold flex-1">Milk Log</h1>
      </div>

      {/* Month navigator */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-xl active:bg-gray-100">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <span className="font-semibold text-gray-900">{MONTH_NAMES[month - 1]} {year}</span>
        <button
          onClick={nextMonth}
          disabled={year === now.getFullYear() && month === now.getMonth() + 1}
          className="p-2 rounded-xl active:bg-gray-100 disabled:opacity-30"
        >
          <ChevronRight size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Summary */}
      <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-200 grid grid-cols-3 divide-x divide-gray-100">
        <div className="p-3 text-center">
          <p className="text-xs text-gray-400 mb-0.5">Morning</p>
          <p className="font-bold text-blue-700">{totalMorning.toFixed(1)}L</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-xs text-gray-400 mb-0.5">Evening</p>
          <p className="font-bold text-indigo-700">{totalEvening.toFixed(1)}L</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-xs text-gray-400 mb-0.5">Total</p>
          <p className="font-bold text-gray-900">{(totalMorning + totalEvening).toFixed(1)}L</p>
        </div>
      </div>

      {/* Day list */}
      <div className="px-4 py-4 space-y-2">
        {loading && <div className="text-center py-8 text-gray-400">Loading…</div>}
        {!loading && days.map(({ d, dateStr, data }) => {
          const isToday = dateStr === today;
          const isFuture = dateStr > today;
          if (isFuture) return null;

          return (
            <div key={dateStr}
              className={`bg-white rounded-2xl border p-3 ${isToday ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-semibold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                  {isToday ? 'Today' : dateStr}
                </span>
                {(data.morning || data.evening) && (
                  <span className="text-xs text-gray-400 font-medium">
                    {((data.morning?.quantity || 0) + (data.evening?.quantity || 0)).toFixed(1)}L total
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MilkCell
                  label="Morning"
                  entry={data.morning}
                  color="blue"
                  onTap={() => setModal({ date: dateStr, session: 'morning', existing: data.morning })}
                />
                <MilkCell
                  label="Evening"
                  entry={data.evening}
                  color="indigo"
                  onTap={() => setModal({ date: dateStr, session: 'evening', existing: data.evening })}
                />
              </div>
            </div>
          );
        })}
      </div>

      <BottomNav />

      {modal && (
        <MilkModal
          modal={modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); loadEntries(); }}
          onDeleted={() => { setModal(null); loadEntries(); }}
        />
      )}
    </div>
  );
}

function MilkCell({ label, entry, color, onTap }: {
  label: string;
  entry?: MilkEntry;
  color: 'blue' | 'indigo';
  onTap: () => void;
}) {
  const colors = {
    blue: { bg: entry ? 'bg-blue-50' : 'bg-gray-50', text: 'text-blue-700', label: 'text-blue-500' },
    indigo: { bg: entry ? 'bg-indigo-50' : 'bg-gray-50', text: 'text-indigo-700', label: 'text-indigo-500' },
  }[color];

  return (
    <button onClick={onTap}
      className={`${colors.bg} rounded-xl p-2.5 text-left active:opacity-70 transition-opacity w-full`}>
      <p className={`text-xs font-medium mb-0.5 ${entry ? colors.label : 'text-gray-400'}`}>{label}</p>
      {entry ? (
        <p className={`font-bold text-lg ${colors.text}`}>{entry.quantity}L</p>
      ) : (
        <p className="text-sm text-gray-400">Tap to log</p>
      )}
    </button>
  );
}

function MilkModal({ modal, onClose, onSaved, onDeleted }: {
  modal: NonNullable<ModalState>;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [qty, setQty] = useState(modal.existing ? String(modal.existing.quantity) : '');
  const [notes, setNotes] = useState(modal.existing?.notes || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function adjust(delta: number) {
    const cur = parseFloat(qty) || 0;
    const next = Math.max(0, Math.round((cur + delta) * 10) / 10);
    setQty(String(next));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const quantity = parseFloat(qty);
    if (isNaN(quantity) || quantity < 0) { setError('Enter a valid quantity'); return; }
    setSaving(true);
    setError('');

    const res = await fetch('/api/milk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: modal.date, session: modal.session, quantity, notes: notes || undefined }),
    });

    setSaving(false);
    if (res.ok) onSaved();
    else { const d = await res.json(); setError(d.error || 'Failed to save'); }
  }

  async function handleDelete() {
    if (!modal.existing) return;
    setDeleting(true);
    await fetch(`/api/milk/${modal.existing.id}`, { method: 'DELETE' });
    setDeleting(false);
    onDeleted();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg capitalize">
            {modal.session} Milk — {modal.date}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400"><X size={20} /></button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity (liters)</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => adjust(-0.5)}
                className="w-12 h-12 bg-gray-100 rounded-xl text-lg font-bold text-gray-700 active:bg-gray-200 flex-shrink-0">
                −½
              </button>
              <button type="button" onClick={() => adjust(-1)}
                className="w-12 h-12 bg-gray-100 rounded-xl text-lg font-bold text-gray-700 active:bg-gray-200 flex-shrink-0">
                −1
              </button>
              <input
                type="number"
                inputMode="decimal"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                step="0.1"
                min="0"
                placeholder="0.5"
                className="flex-1 border border-gray-300 rounded-xl px-3 py-3 text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="button" onClick={() => adjust(0.5)}
                className="w-12 h-12 bg-blue-50 rounded-xl text-sm font-bold text-blue-700 active:bg-blue-100 flex-shrink-0">
                +½
              </button>
              <button type="button" onClick={() => adjust(1)}
                className="w-12 h-12 bg-blue-50 rounded-xl text-lg font-bold text-blue-700 active:bg-blue-100 flex-shrink-0">
                +1
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any remarks"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-2">
            {modal.existing && (
              <button type="button" onClick={handleDelete} disabled={deleting}
                className="flex-1 bg-red-50 text-red-600 rounded-xl py-3 font-semibold active:bg-red-100 disabled:opacity-60">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 text-white rounded-xl py-3 font-semibold active:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
