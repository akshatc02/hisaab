'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function NewBatchPage() {
  const router = useRouter();
  const [sentDate, setSentDate] = useState(todayStr());
  const [sentCount, setSentCount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const count = parseInt(sentCount);
    if (!sentDate) { setError('Date is required'); return; }
    if (!sentCount || isNaN(count) || count < 1) { setError('Enter at least 1 piece'); return; }

    setLoading(true);
    setError('');

    const res = await fetch('/api/ironing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sent_date: sentDate, sent_count: count, notes: notes || undefined }),
    });

    setLoading(false);

    if (res.ok) {
      router.push('/ironing');
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to create batch');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-2 sticky top-0 z-40">
        <Link href="/ironing" className="p-1 text-gray-500"><ArrowLeft size={20} /></Link>
        <h1 className="text-xl font-bold">New Ironing Batch</h1>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Sent</label>
            <input
              type="date"
              value={sentDate}
              onChange={(e) => setSentDate(e.target.value)}
              max={todayStr()}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Number of Pieces Sent
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={sentCount}
              onChange={(e) => setSentCount(e.target.value)}
              placeholder="e.g. 14"
              min="1"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 2 shirts, 1 saree, 3 pants"
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold text-base active:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {loading ? 'Creating…' : 'Create Batch'}
        </button>
      </form>
    </div>
  );
}
