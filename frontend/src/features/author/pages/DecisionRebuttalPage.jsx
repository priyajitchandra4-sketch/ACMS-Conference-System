import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { decisionsApi } from '../../../api/decisions';
import { ActionButton, ErrorMessage, Loading, Notice, PageTitle, Panel, StatusPill } from '../../shared/PhaseUi';

export default function DecisionRebuttalPage() {
  const { id: paperId } = useParams(); const qc = useQueryClient(); const [text, setText] = useState(''); const [notice, setNotice] = useState('');
  const decision = useQuery({ queryKey: ['author-decision', paperId], queryFn: () => decisionsApi.getPaperDecision(paperId) });
  const rebuttal = useQuery({ queryKey: ['rebuttal', paperId], queryFn: () => decisionsApi.getRebuttal(paperId) });
  useEffect(() => { if (rebuttal.data) setText(rebuttal.data.rebuttal || ''); }, [rebuttal.data]);
  const mutation = useMutation({ mutationFn: () => decisionsApi.submitRebuttal(paperId, text), onSuccess: data => { qc.setQueryData(['rebuttal', paperId], data); setNotice('Rebuttal saved.'); } });
  if (decision.isLoading || rebuttal.isLoading) return <Loading label="Loading decision…" />;
  if (decision.isError) return <div className="p-6"><ErrorMessage error={decision.error} /></div>;
  const d = decision.data || {}; const locked = !!rebuttal.data?.submitted_at;
  return <div className="p-6 max-w-4xl mx-auto text-white space-y-5"><Link to="/author/papers" className="text-sm text-[#ff8b6e] hover:underline">← My papers</Link><PageTitle title="Decision and Rebuttal" subtitle={d.title || `Paper ${d.paper_number || paperId}`} /><Panel><div className="flex items-center gap-3"><span className="text-gray-400">Decision</span><StatusPill value={d.decision || 'pending'} /></div><h2 className="font-semibold mt-4">Message from the committee</h2><p className="text-sm text-gray-300 mt-2 whitespace-pre-wrap">{d.rationale || 'No decision letter is available yet.'}</p></Panel><Panel><h2 className="text-lg font-semibold">Author rebuttal</h2><p className="text-xs text-gray-500 mt-1 mb-3">Respond to reviewer concerns professionally. Do not include identifying details if your rebuttal is double-blind.</p><textarea disabled={locked} value={text} onChange={e => setText(e.target.value)} rows={10} maxLength={12000} className="w-full bg-[#121214] border border-white/10 rounded-xl p-3 disabled:opacity-60" placeholder="Enter your point-by-point response…" />{notice && <p className="text-green-300 mt-3 text-sm">{notice}</p>}{mutation.isError && <p className="text-red-300 mt-3 text-sm">{mutation.error?.response?.data?.detail || 'Could not save rebuttal.'}</p>}<div className="mt-4 flex items-center gap-3">{!locked ? <ActionButton busy={mutation.isPending} disabled={!text.trim()} onClick={() => mutation.mutate()}>Save rebuttal</ActionButton> : <StatusPill value="submitted" />}{locked && <Link to={`/author/papers/${paperId}/camera-ready`} className="text-sm text-[#ff8b6e] hover:underline">Continue to camera-ready →</Link>}</div></Panel></div>;
}
