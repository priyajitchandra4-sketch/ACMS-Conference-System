import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { delegatesApi } from '../../../api/delegates';
import { ErrorMessage, Loading, PageTitle, Panel, StatusPill } from '../../shared/PhaseUi';

export default function DelegatePaymentsPage() {
  const [status, setStatus] = useState('');
  const query = useQuery({ queryKey: ['chair-delegates', status], queryFn: () => delegatesApi.listForChair(status ? { status } : {}) });
  if (query.isLoading) return <Loading label="Loading delegate registrations…" />;
  if (query.isError) return <div className="p-6"><ErrorMessage error={query.error} /></div>;
  const rows = query.data || [];
  return <div className="p-6 text-white"><PageTitle eyebrow="Phase 9 · Chair" title="Delegates and payments" subtitle="Review registration and payment state. Do not store or display raw card data." /><select value={status} onChange={e => setStatus(e.target.value)} className="mb-4 bg-[#18181b] border border-white/10 rounded-xl p-2"><option value="">All registrations</option>{['pending','confirmed','cancelled'].map(v => <option key={v} value={v}>{v}</option>)}</select><Panel className="overflow-x-auto !p-0"><table className="w-full text-left text-sm"><thead className="bg-white/5 text-gray-400"><tr><th className="px-4 py-3">Attendee</th><th className="px-4 py-3">Conference</th><th className="px-4 py-3">Ticket</th><th className="px-4 py-3">Registration</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Amount</th></tr></thead><tbody className="divide-y divide-white/10">{rows.map(r => <tr key={r.registration_id || r.id}><td className="px-4 py-3">{r.attendee_name}<div className="text-xs text-gray-500">{r.email}</div></td><td className="px-4 py-3">{r.conference_name || r.conference_id}</td><td className="px-4 py-3 capitalize">{r.ticket_type}</td><td className="px-4 py-3"><StatusPill value={r.status} /></td><td className="px-4 py-3"><StatusPill value={r.payment_status} /></td><td className="px-4 py-3">{r.currency} {r.amount ?? '—'}</td></tr>)}{!rows.length && <tr><td colSpan={6} className="p-8 text-center text-gray-500">No registrations found.</td></tr>}</tbody></table></Panel></div>;
}
