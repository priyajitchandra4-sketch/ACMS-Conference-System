import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { assignmentsApi } from '../../../api/assignments';
import { reviewsApi } from '../../../api/reviews';

export default function ReviewProgressPage() {
  const [trackId, setTrackId] = useState('');
  const tracks = useQuery({ queryKey: ['tracks','mine'], queryFn: assignmentsApi.getMyTracks });
  useEffect(() => { if (!trackId && tracks.data?.length) setTrackId(String(tracks.data[0].id)); }, [tracks.data, trackId]);
  const progress = useQuery({ queryKey: ['review-progress', trackId], queryFn: () => reviewsApi.getProgress(trackId), enabled: !!trackId });
  if (tracks.isLoading) return <p className="p-6 text-gray-400">Loading tracks…</p>;
  if (tracks.isError) return <p className="p-6 text-red-400">{tracks.error?.response?.data?.detail || 'Could not load tracks.'}</p>;
  return <div className="p-6 text-white">
    <h1 className="text-2xl font-bold">Review Progress</h1><p className="text-gray-400 mt-1 mb-5">Track-level completion overview. Reviewer identities are not shown.</p>
    <select value={trackId} onChange={(e) => setTrackId(e.target.value)} className="mb-4 bg-[#18181b] border border-white/10 rounded-xl px-3 py-2"><option value="">Choose track…</option>{(tracks.data || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
    {progress.isLoading && <p className="text-gray-500">Loading progress…</p>}{progress.isError && <p className="text-red-400">{progress.error?.response?.data?.detail || 'Could not load progress.'}</p>}
    <div className="bg-[#18181b] border border-white/10 rounded-2xl overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-white/5 text-gray-400"><tr><th className="px-4 py-3">Paper</th><th className="px-4 py-3">Title</th><th className="px-4 py-3">Assigned</th><th className="px-4 py-3">Accepted</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3">Pending</th></tr></thead><tbody className="divide-y divide-white/10">{(progress.data || []).map(p => <tr key={p.paper_id}><td className="px-4 py-3 text-gray-500">{p.paper_number || p.paper_id}</td><td className="px-4 py-3">{p.paper_title}</td><td className="px-4 py-3">{p.assigned}</td><td className="px-4 py-3">{p.accepted}</td><td className="px-4 py-3 text-green-300">{p.submitted}</td><td className="px-4 py-3 text-yellow-300">{p.pending}</td></tr>)}</tbody></table></div>
  </div>;
}
