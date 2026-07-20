'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { ArrowLeft, CheckCircle } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [ironingRate, setIroningRate] = useState('');
  const [milkRate, setMilkRate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/settings').then(async (r) => {
      if (r.status === 401) { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login'); return; }
      const d = await r.json();
      setIroningRate(d.ironing_rate || '0');
      setMilkRate(d.milk_rate || '0');
      setLoading(false);
    });
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const ir = parseFloat(ironingRate);
    const mr = parseFloat(milkRate);

    if (isNaN(ir) || ir < 0) { setError('Ironing rate must be 0 or more'); return; }
    if (isNaN(mr) || mr < 0) { setError('Milk rate must be 0 or more'); return; }

    setSaving(true);
    setError('');
    setSaved(false);

    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ironing_rate: ir, milk_rate: mr }),
    });

    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      const d = await res.json();
      setError(d.error || 'Failed to save');
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-2 sticky top-0 z-40">
        <Link href="/" className="p-1 text-gray-500"><ArrowLeft size={20} /></Link>
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <form onSubmit={handleSave} className="px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
          <h2 className="font-semibold text-gray-900">Rates</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Ironing Rate <span className="text-gray-400 font-normal">(₹ per piece)</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
              <input
                type="number"
                inputMode="decimal"
                value={ironingRate}
                onChange={(e) => setIroningRate(e.target.value)}
                min="0"
                step="0.5"
                placeholder="e.g. 3"
                className="w-full border border-gray-300 rounded-xl pl-8 pr-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Example: ₹3 per piece → 14 pieces = ₹42
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Milk Rate <span className="text-gray-400 font-normal">(₹ per liter)</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
              <input
                type="number"
                inputMode="decimal"
                value={milkRate}
                onChange={(e) => setMilkRate(e.target.value)}
                min="0"
                step="0.5"
                placeholder="e.g. 60"
                className="w-full border border-gray-300 rounded-xl pl-8 pr-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Example: ₹60/liter → 30L = ₹1,800
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-1">Note on rates</h2>
          <p className="text-sm text-gray-500">
            Changing rates affects all future billing calculations. Months you've already marked as "settled" preserve the rate that was locked at settlement time.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {saved && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm">
            <CheckCircle size={16} />
            Rates saved successfully!
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold text-base active:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Rates'}
        </button>
      </form>
    </div>
  );
}
