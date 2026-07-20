'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Download } from 'lucide-react';

const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface Settlement {
  id: number;
  year: number;
  month: number;
  service: string;
  total_quantity: number;
  rate: number;
  amount: number;
  settled: number;
  settled_date?: string;
  notes?: string;
}

interface BillingData {
  year: number;
  month: number;
  ironing: {
    total_pieces: number;
    pending_batches: number;
    rate: number;
    amount: number;
    settlement: Settlement | null;
  };
  milk: {
    total_liters: number;
    rate: number;
    amount: number;
    settlement: Settlement | null;
  };
}

export default function BillingPage() {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/billing?year=${year}&month=${month}`);
    if (res.status === 401) { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login'); return; }
    setData(await res.json());
    setLoading(false);
  }, [year, month, router]);

  useEffect(() => { load(); }, [load]);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    if (isCurrentMonth) return;
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  async function handleSettle(service: 'ironing' | 'milk') {
    if (!data) return;
    setSettling(service);
    const res = await fetch('/api/billing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: data.year, month: data.month, service }),
    });
    setSettling(null);
    if (res.ok) load();
  }

  async function handleExport() {
    if (!data) return;
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageW = doc.internal.pageSize.getWidth();
      let y = 20;

      // Title
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Hisaab', pageW / 2, y, { align: 'center' });
      y += 8;

      doc.setFontSize(13);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Monthly Bill — ${MONTH_NAMES[month - 1]} ${year}`, pageW / 2, y, { align: 'center' });
      y += 5;

      doc.setDrawColor(200);
      doc.line(15, y, pageW - 15, y);
      y += 8;

      doc.setTextColor(0);

      const row = (label: string, value: string, bold = false) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(11);
        doc.text(label, 20, y);
        doc.text(value, pageW - 20, y, { align: 'right' });
        y += 7;
      };

      // Ironing section
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Ironing', 20, y);
      y += 7;
      row('Pieces ironed', String(data.ironing.total_pieces));
      row('Rate per piece', `₹${data.ironing.rate}`);
      row('Total', `₹${data.ironing.amount.toFixed(2)}`, true);
      if (data.ironing.settlement?.settled) {
        doc.setTextColor(34, 197, 94);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`✓ Settled on ${data.ironing.settlement.settled_date}`, 20, y);
        doc.setTextColor(0);
        y += 7;
      }
      y += 3;

      doc.setDrawColor(220);
      doc.line(20, y, pageW - 20, y);
      y += 6;

      // Milk section
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text('Milk', 20, y);
      y += 7;
      row('Total liters', `${data.milk.total_liters.toFixed(2)}L`);
      row('Rate per liter', `₹${data.milk.rate}`);
      row('Total', `₹${data.milk.amount.toFixed(2)}`, true);
      if (data.milk.settlement?.settled) {
        doc.setTextColor(34, 197, 94);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`✓ Settled on ${data.milk.settlement.settled_date}`, 20, y);
        doc.setTextColor(0);
        y += 7;
      }
      y += 3;

      doc.setDrawColor(50);
      doc.line(15, y, pageW - 15, y);
      y += 8;

      // Grand total
      const grand = data.ironing.amount + data.milk.amount;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Grand Total', 20, y);
      doc.text(`₹${grand.toFixed(2)}`, pageW - 20, y, { align: 'right' });
      y += 12;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150);
      doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')} · Hisaab`, pageW / 2, y, { align: 'center' });

      doc.save(`Hisaab_${MONTH_SHORT[month - 1]}_${year}.pdf`);
    } catch (e) {
      alert('Failed to generate PDF. Please try again.');
    }
    setExporting(false);
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-2 sticky top-0 z-40">
        <Link href="/" className="p-1 text-gray-500"><ArrowLeft size={20} /></Link>
        <h1 className="text-xl font-bold flex-1">Billing</h1>
        <button
          onClick={handleExport}
          disabled={exporting || !data}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-xl text-sm font-medium text-gray-700 active:bg-gray-200 disabled:opacity-50"
        >
          <Download size={15} />
          {exporting ? 'Generating…' : 'Export PDF'}
        </button>
      </div>

      {/* Month navigator */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-xl active:bg-gray-100">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <span className="font-semibold text-gray-900">{MONTH_NAMES[month - 1]} {year}</span>
        <button onClick={nextMonth} disabled={isCurrentMonth}
          className="p-2 rounded-xl active:bg-gray-100 disabled:opacity-30">
          <ChevronRight size={20} className="text-gray-600" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data ? (
        <div className="px-4 py-4 space-y-4">
          {/* Ironing card */}
          <ServiceCard
            title="Ironing"
            emoji="👕"
            quantity={`${data.ironing.total_pieces} pieces`}
            rate={`₹${data.ironing.rate}/piece`}
            amount={data.ironing.amount}
            settlement={data.ironing.settlement}
            pendingWarning={data.ironing.pending_batches > 0 ? `${data.ironing.pending_batches} batch(es) still pending — totals may be incomplete` : undefined}
            onSettle={() => handleSettle('ironing')}
            settling={settling === 'ironing'}
          />

          {/* Milk card */}
          <ServiceCard
            title="Milk"
            emoji="🥛"
            quantity={`${data.milk.total_liters.toFixed(2)}L`}
            rate={`₹${data.milk.rate}/liter`}
            amount={data.milk.amount}
            settlement={data.milk.settlement}
            onSettle={() => handleSettle('milk')}
            settling={settling === 'milk'}
          />

          {/* Grand total */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900 text-lg">Grand Total</span>
              <span className="font-bold text-2xl text-gray-900">
                ₹{(data.ironing.amount + data.milk.amount).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Export hint */}
          <p className="text-center text-xs text-gray-400 px-4">
            Tap "Export PDF" above to download a shareable bill summary for this month.
          </p>
        </div>
      ) : null}

      <BottomNav />
    </div>
  );
}

function ServiceCard({
  title, emoji, quantity, rate, amount, settlement, pendingWarning, onSettle, settling,
}: {
  title: string;
  emoji: string;
  quantity: string;
  rate: string;
  amount: number;
  settlement: Settlement | null;
  pendingWarning?: string;
  onSettle: () => void;
  settling: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <span className="text-xl">{emoji}</span>
        <h2 className="font-bold text-gray-900">{title}</h2>
        {settlement?.settled ? (
          <span className="ml-auto flex items-center gap-1 text-green-600 text-xs font-semibold">
            <CheckCircle size={13} /> Settled
          </span>
        ) : null}
      </div>

      {pendingWarning && (
        <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-100 flex items-start gap-2">
          <AlertTriangle size={14} className="text-yellow-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-yellow-800">{pendingWarning}</p>
        </div>
      )}

      <div className="divide-y divide-gray-100">
        <div className="px-4 py-2.5 flex justify-between text-sm">
          <span className="text-gray-500">Quantity</span>
          <span className="font-medium">{quantity}</span>
        </div>
        <div className="px-4 py-2.5 flex justify-between text-sm">
          <span className="text-gray-500">Rate</span>
          <span className="font-medium">{rate}</span>
        </div>
        <div className="px-4 py-2.5 flex justify-between">
          <span className="font-semibold text-gray-900">Amount Due</span>
          <span className="font-bold text-lg text-gray-900">₹{amount.toFixed(2)}</span>
        </div>
      </div>

      {settlement?.settled ? (
        <div className="px-4 py-3 bg-green-50 border-t border-green-100">
          <p className="text-sm text-green-700">
            Settled on {settlement.settled_date} · ₹{settlement.amount.toFixed(2)} at ₹{settlement.rate}/unit
          </p>
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-gray-100">
          <button
            onClick={onSettle}
            disabled={settling}
            className="w-full bg-green-600 text-white rounded-xl py-3 font-semibold text-sm active:bg-green-700 disabled:opacity-60"
          >
            {settling ? 'Marking settled…' : 'Mark as Settled'}
          </button>
        </div>
      )}
    </div>
  );
}
