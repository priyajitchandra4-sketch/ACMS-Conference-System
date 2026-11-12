import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { decisionsApi } from '../../../api/decisions';
import { ErrorMessage, Loading, PageTitle, Panel, StatusPill } from '../../shared/PhaseUi';

export default function DecisionQueuePage() {
  const query = useQuery({ queryKey: ['decision-queue'], queryFn: () => decisionsApi.chairQueue() });
  if (query.isLoading) return <Loading label="Loading decision queue…" />;
  if (query.isError) return <div className="p-6"><ErrorMessage error={query.error} fallback="Could not load the decision queue." /></div>;
  const papers = query.data || [];
  return <div className="p-6 text-white"><PageTitle eyebrow="Phase 7 · Chair / Meta-Reviewer" title="Decision Queue" subtitle="Review submitted reports and record a reasoned decision. Reviewer identities remain anonymous." />
    <Panel className="overflow-x-auto !p-0"><table className="w-full text-left text-sm"><thead className="bg-white/5 text-gray-400"><tr><th className="px-4 py-3">Paper</th><th className="px-4 py-3">Title</th><th className="px-4 py-3">Reviews</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Decision</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-white/10">{papers.map(p => <tr key={p.paper_id} className="hover:bg-white/5"><td className="px-4 py-3 text-gray-400">{p.paper_number || p.paper_id}</td><td className="px-4 py-3"><div className="font-semibold">{p.title}</div><div className="text-xs text-gray-500">{p.track_name || 'Unassigned track'}</div></td><td className="px-4 py-3">{p.submitted_reviews ?? p.review_count ?? 0}</td><td className="px-4 py-3"><StatusPill value={p.status} /></td><td className="px-4 py-3"><StatusPill value={p.decision || 'not decided'} /></td><td className="px-4 py-3"><Link className="text-[#ff8b6e] hover:underline" to={`/meta/papers/${p.paper_id}/decision`}>Open decision →</Link></td></tr>)}{!papers.length && <tr><td colSpan={6} className="p-8 text-center text-gray-500">No papers are ready for a decision.</td></tr>}</tbody></table></Panel>
  </div>;
}
