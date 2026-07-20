'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

interface IroningBatch {
  id: number;
  sent_date: string;
  sent_count: number;
  received_date?: string;
  received_count?: number;
  status: string;
  notes?: string;
  resolution_notes?: string;
}

export default function BatchDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [batch, setBatch] = useState<IroningBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Receive form
  const [receivedCount, setReceivedCount] = useState('');
  const [receiveNotes, setReceiveNotes] = useState('');

  // Dispute resolution
  const [resolutionNote, setResolutionNote] = useState('');

  // Add note
  const [addNote, setAddNote] = useState('');
  const [showNoteForm, setShowNoteForm] = useState(false);

  useEffect(() => {
    fetch(`/api/ironing/${params.id}`).then(async (r) => {
      if (r.status === 401) { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login'); return; }
      if (r.status === 404) { router.push('/ironing'); return; }
      const data = await r.json();
      setBatch(data);
      if (data.notes) setAddNote(data.notes);
      setLoading(false);
    });
  }, [params.id, router]);

  async function handleReceive(e: React.FormEvent) {
    e.preventDefault();
    const count = parseInt(receivedCount);
    if (isNaN(count) || count < 0) { setError('Enter a valid received count (0 or more)'); return; }
    setSubmitting(true);
    setError('');

    const res = await fetch(`/api/ironing/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'receive', received_count: count, notes: receiveNotes || undefined }),
    });

    setSubmitting(false);
    if (res.ok) {
      setBatch(await res.json());
    } else {
      const d = await res.json();
      setError(d.error || 'Failed to update');
    }
  }

  async function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const res = await fetch(`/api/ironing/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resolve', resolution_notes: resolutionNote || undefined }),
    });

    setSubmitting(false);
    if (res.ok) setBatch(await res.json());
    else { const d = await res.json(); setError(d.error || 'Failed'); }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch(`/api/ironing/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_note', notes: addNote }),
    });
    setSubmitting(false);
    if (res.ok) { setBatch(await res.json()); setShowNoteForm(false); }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!batch) return null;

  const diff = batch.received_count !== undefined && batch.received_count !== null
    ? batch.received_count - batch.sent_count
    : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-2 sticky top-0 z-40">
        <Link href="/ironing" className="p-1 text-gray-500"><ArrowLeft size={20} /></Link>
        <h1 className="text-xl font-bold">Batch Detail</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Status banner */}
        {batch.status === 'PENDING' && (
          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3">
            <Clock size={18} className="text-yellow-600" />
            <span className="font-semibold text-yellow-800">Pending — Clothes Out</span>
          </div>
        )}
        {batch.status === 'RECEIVED' && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
            <CheckCircle size={18} className="text-green-600" />
            <span className="font-semibold text-green-800">Received — All Good</span>
          </div>
        )}
        {batch.status === 'DISPUTED' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={18} className="text-red-600" />
              <span className="font-semibold text-red-800">Disputed</span>
            </div>
            {diff !== null && (
              <p className="text-red-700 text-sm font-medium">
                Sent {batch.sent_count}, Received {batch.received_count} —{' '}
                {diff < 0 ? `Short by ${Math.abs(diff)}` : `Extra ${diff}`}
              </p>
            )}
          </div>
        )}
        {batch.status === 'RESOLVED' && (
          <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-2xl px-4 py-3">
            <CheckCircle size={18} className="text-gray-500" />
            <span className="font-semibold text-gray-700">Resolved & Closed</span>
          </div>
        )}

        {/* Batch info */}
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          <div className="px-4 py-3 flex justify-between">
            <span className="text-gray-500 text-sm">Date Sent</span>
            <span className="font-medium">{batch.sent_date}</span>
          </div>
          <div className="px-4 py-3 flex justify-between">
            <span className="text-gray-500 text-sm">Pieces Sent</span>
            <span className="font-medium">{batch.sent_count}</span>
          </div>
          {batch.received_date && (
            <div className="px-4 py-3 flex justify-between">
              <span className="text-gray-500 text-sm">Date Received</span>
              <span className="font-medium">{batch.received_date}</span>
            </div>
          )}
          {batch.received_count !== undefined && batch.received_count !== null && (
            <div className="px-4 py-3 flex justify-between">
              <span className="text-gray-500 text-sm">Pieces Received</span>
              <span className={`font-medium ${diff === 0 ? 'text-green-600' : 'text-red-600'}`}>
                {batch.received_count}
              </span>
            </div>
          )}
          {batch.notes && (
            <div className="px-4 py-3">
              <span className="text-gray-500 text-sm block mb-1">Notes</span>
              <span className="text-sm text-gray-800">{batch.notes}</span>
            </div>
          )}
          {batch.resolution_notes && (
            <div className="px-4 py-3">
              <span className="text-gray-500 text-sm block mb-1">Resolution</span>
              <span className="text-sm text-gray-800">{batch.resolution_notes}</span>
            </div>
          )}
        </div>

        {/* PENDING: Receive form */}
        {batch.status === 'PENDING' && (
          <form onSubmit={handleReceive} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
            <h2 className="font-semibold text-gray-900">Mark as Received</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Pieces Received</label>
              <input
                type="number"
                inputMode="numeric"
                value={receivedCount}
                onChange={(e) => setReceivedCount(e.target.value)}
                placeholder={`Expected: ${batch.sent_count}`}
                min="0"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={receiveNotes}
                onChange={(e) => setReceiveNotes(e.target.value)}
                placeholder="Any remarks about the return"
                rows={2}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-green-600 text-white py-3.5 rounded-xl font-semibold active:bg-green-700 disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Confirm Received'}
            </button>
          </form>
        )}

        {/* DISPUTED: Add note + Resolve form */}
        {batch.status === 'DISPUTED' && (
          <>
            {!showNoteForm ? (
              <button
                onClick={() => setShowNoteForm(true)}
                className="w-full bg-white border border-gray-300 rounded-xl py-3 text-gray-700 font-medium active:bg-gray-50"
              >
                Add / Edit Note
              </button>
            ) : (
              <form onSubmit={handleAddNote} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                <textarea
                  value={addNote}
                  onChange={(e) => setAddNote(e.target.value)}
                  placeholder="What happened with the missing pieces?"
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowNoteForm(false)}
                    className="flex-1 bg-gray-100 rounded-xl py-3 text-gray-600 font-medium">Cancel</button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 bg-blue-600 text-white rounded-xl py-3 font-medium disabled:opacity-60">
                    {submitting ? 'Saving…' : 'Save Note'}
                  </button>
                </div>
              </form>
            )}

            <form onSubmit={handleResolve} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
              <h2 className="font-semibold text-gray-900">Close Dispute</h2>
              <p className="text-sm text-gray-500">
                This marks the batch as resolved. It will not count toward billing (only fully RECEIVED batches are billed).
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Resolution Note <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="e.g. Agreed to deduct 2 pieces from next payment"
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-red-600 text-white py-3.5 rounded-xl font-semibold active:bg-red-700 disabled:opacity-60"
              >
                {submitting ? 'Saving…' : 'Close Dispute'}
              </button>
            </form>
          </>
        )}

        {/* RECEIVED/RESOLVED: Edit note */}
        {(batch.status === 'RECEIVED' || batch.status === 'RESOLVED') && (
          !showNoteForm ? (
            <button
              onClick={() => setShowNoteForm(true)}
              className="w-full bg-white border border-gray-300 rounded-xl py-3 text-gray-600 text-sm font-medium active:bg-gray-50"
            >
              Edit Note
            </button>
          ) : (
            <form onSubmit={handleAddNote} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
              <textarea
                value={addNote}
                onChange={(e) => setAddNote(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowNoteForm(false)}
                  className="flex-1 bg-gray-100 rounded-xl py-3 text-gray-600 font-medium">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-blue-600 text-white rounded-xl py-3 font-medium disabled:opacity-60">
                  {submitting ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          )
        )}
      </div>
    </div>
  );
}
