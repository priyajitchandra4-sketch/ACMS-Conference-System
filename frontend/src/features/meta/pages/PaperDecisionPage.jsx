import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { decisionsApi } from '../../../api/decisions';
import { reviewsApi } from '../../../api/reviews';
import { ActionButton, ErrorMessage, Loading, Notice, PageTitle, Panel, StatusPill } from '../../shared/PhaseUi';

export default function PaperDecisionPage() {
  const { paperId } = useParams(); const qc = useQueryClient();
  const [decision, setDecision] = useState(''); const [rationale, setRationale] = useState(''); const [message, setMessage] = useState('');
  const decisionQuery = useQuery({ queryKey: ['decision', paperId], queryFn: () => decisionsApi.getPaperDecision(paperId) });
  const reviewsQuery = useQuery({ queryKey: ['paper-reviews', paperId], queryFn: () => reviewsApi.getForManager(paperId) });
  const mutation = useMutation({ mutationFn: () => decisionsApi.decide(paperId, { decision, rationale }), onSuccess: (data) => { setMessage('Decision recorded.'); qc.setQueryData(['decision', paperId], data); qc.invalidateQueries({ queryKey: ['decision-queue'] }); }, });
  if (decisionQuery.isLoading || reviewsQuery.isLoading) return <Loading label="Loading paper and reports…" />;
  if (decisionQuery.isError) return <div className="p-6"><ErrorMessage error={decisionQuery.error} /></div>;
  const paper = decisionQuery.data || {}; const reviews = reviewsQuery.data || [];
  return <div className="p-6 max-w-5xl mx-auto text-white space-y-5"><Link to="/chair/decisions" className="text-sm text-[#ff8b6e] hover:underline">← Decision queue</Link><PageTitle title={paper.title || `Paper ${paper.paper_number || paperId}`} subtitle={`${paper.paper_number || ''} · ${paper.track_name || ''}`} />
    {paper.abstract && <Panel><h2 className="font-semibold mb-2">Abstract</h2><p className="text-sm text-gray-300 whitespace-pre-wrap">{paper.abstract}</p></Panel>}
    <div className="space-y-3"><h2 className="text-lg font-semibold">Reviewer reports</h2>{reviews.map(r => <Panel key={r.assignment_id}><div className="flex justify-between"><strong>{r.anon_label}</strong><StatusPill value={r.status} /></div><p className="text-sm text-gray-400 mt-2">Rating: {r.rating ?? '—'} / 5 · Confidence: {r.confidence ?? '—'} / 5 · Recommendation: {r.recommendation || '—'}</p><p className="text-sm mt-3 whitespace-pre-wrap">{r.summary || 'No summary provided.'}</p></Panel>)}{!reviews.length && <Notice tone="info">No reports are available yet.</Notice>}</div>
    <Panel><h2 className="text-lg font-semibold mb-4">Record decision</h2><label className="block text-sm mb-3">Decision<select value={decision || paper.decision || ''} onChange={e => setDecision(e.target.value)} className="mt-1 block w-full max-w-md bg-[#121214] border border-white/10 rounded-xl p-3"><option value="">Choose…</option><option value="accept">Accept</option><option value="minor_revisions">Minor revisions</option><option value="major_revisions">Major revisions</option><option value="reject">Reject</option></select></label><label className="block text-sm">Decision rationale<textarea rows={5} maxLength={12000} value={rationale || paper.rationale || ''} onChange={e => setRationale(e.target.value)} className="mt-1 block w-full bg-[#121214] border border-white/10 rounded-xl p-3" placeholder="Summarize the evidence and explain the outcome." /></label>{message && <p className="text-green-300 text-sm mt-3">{message}</p>}{mutation.isError && <p className="text-red-300 text-sm mt-3">{mutation.error?.response?.data?.detail || 'Could not save decision.'}</p>}<div className="mt-4"><ActionButton busy={mutation.isPending} disabled={!decision && !paper.decision} onClick={() => { if (window.confirm('Save this decision?')) mutation.mutate(); }}>Save decision</ActionButton></div></Panel>
  </div>;
}
