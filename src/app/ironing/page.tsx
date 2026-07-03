'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { Plus, Clock, CheckCircle, AlertTriangle, ChevronRight, ArrowLeft } from 'lucide-react';

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

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
  RECEIVED: { label: 'Received', bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
  DISPUTED: { label: 'Disputed', bg: 'bg-red-100', text: 'text-red-800', icon: AlertTriangle },
  RESOLVED: { label: 'Resolved', bg: 'bg-gray-100', text: 'text-gray-600', icon: CheckCircle },
};

function daysSince(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - d.getTime()) / 86400000);
}

export default function IroningPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<IroningBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ironing').then(async (r) => {
      if (r.status === 401) { router.push('/login'); return; }
      setBatches(await r.json());
      setLoading(false);
    });
  }, [router]);

  const hasPending = batches.some((b) => b.status === 'PENDING');

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Link href="/" className="p-1 text-gray-500"><ArrowLeft size={20} /></Link>
          <h1 className="text-xl font-bold">Ironing</h1>
        </div>
        <Link
          href="/ironing/new"
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            hasPending
              ? 'bg-gray-100 text-gray-400 pointer-events-none'
              : 'bg-blue-600 text-white active:bg-blue-700'
          }`}
        >
          <Plus size={16} />
          New Batch
        </Link>
      </div>

      {hasPending && (
        <div className="mx-4 mt-4 bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 text-sm text-yellow-800">
          Receive the pending batch before creating a new one.
        </div>
      )}

      <div className="px-4 py-4 space-y-3">
        {batches.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">👕</p>
            <p>No batches yet. Tap <strong>New Batch</strong> to get started.</p>
          </div>
        )}

        {batches.map((batch) => {
          const cfg = STATUS_CONFIG[batch.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.RESOLVED;
          const Icon = cfg.icon;
          return (
            <Link
              key={batch.id}
              href={`/ironing/${batch.id}`}
              className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between active:bg-gray-50 block"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                    <Icon size={11} />
                    {cfg.label}
                  </span>
                  {batch.status === 'PENDING' && (
                    <span className="text-xs text-gray-400">{daysSince(batch.sent_date)}d ago</span>
                  )}
                </div>
                <p className="font-semibold text-gray-900">
                  Sent {batch.sent_count} pieces
                  {batch.received_count !== undefined && batch.received_count !== null && (
                    <span className={`ml-2 text-sm font-normal ${batch.received_count === batch.sent_count ? 'text-green-600' : 'text-red-500'}`}>
                      · Got back {batch.received_count}
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Sent {batch.sent_date}
                  {batch.received_date && ` · Received ${batch.received_date}`}
                </p>
                {batch.notes && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{batch.notes}</p>
                )}
              </div>
              <ChevronRight size={18} className="text-gray-400 ml-2 flex-shrink-0" />
            </Link>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
