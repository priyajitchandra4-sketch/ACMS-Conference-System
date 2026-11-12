import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '../../../api/reviews';
import DiscussionPanel from '../../shared/discussion/DiscussionPanel';

const blank = { summary: '', strengths: '', weaknesses: '', questions: '', rating: '', confidence: '', recommendation: '', confidential_comments: '' };
const fields = [
  ['summary', 'Summary', 'Concise summary of the contribution and approach.'],
  ['strengths', 'Strengths', 'What are the strongest aspects of this paper?'],
  ['weaknesses', 'Weaknesses', 'What are the main limitations or concerns?'],
  ['questions', 'Questions for the authors', 'Questions that could clarify the work.'],
  ['confidential_comments', 'Confidential note to the Meta-Reviewer', 'Visible only to the Meta-Reviewer and authorized chairs.'],
];

export default function ReviewWorkspacePage() {
  const { paperId } = useParams();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(blank);
  const [notice, setNotice] = useState('');
  const query = useQuery({ queryKey: ['my-review', paperId], queryFn: () => reviewsApi.getMine(paperId) });
  useEffect(() => {
    if (query.data) setForm({
      summary: query.data.summary || '', strengths: query.data.strengths || '',
      weaknesses: query.data.weaknesses || '', questions: query.data.questions || '',
      rating: query.data.rating ?? '', confidence: query.data.confidence ?? '',
      recommendation: query.data.recommendation || '', confidential_comments: query.data.confidential_comments || '',
    });
  }, [query.data]);
  const saveMutation = useMutation({
    mutationFn: (submit) => reviewsApi.save(paperId, {
      ...form, rating: form.rating === '' ? null : Number(form.rating),
      confidence: form.confidence === '' ? null : Number(form.confidence), submit,
    }),
    onSuccess: (data) => {
      queryClient.setQueryData(['my-review', paperId], data);
      queryClient.invalidateQueries({ queryKey: ['reviews', 'mine'] });
      setNotice(data.status === 'submitted' ? 'Review submitted. It is now locked.' : 'Draft saved.');
    },
  });
  if (query.isLoading) return <p className="p-6 text-gray-400">Loading review…</p>;
  if (query.isError) return <div className="p-6 text-red-400">{query.error?.response?.data?.detail || 'Could not load review.'}</div>;
  const data = query.data;
  const locked = data.status === 'submitted';
  const change = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  return (
    <div className="p-6 max-w-5xl mx-auto text-white space-y-5">
      <Link to="/reviewer/assignments" className="text-sm text-[#ff5c35] hover:underline">← My assignments</Link>
      <header className="bg-[#18181b] border border-white/10 rounded-2xl p-5">
        <div className="text-xs text-gray-500">{data.paper_number} · {data.anon_label}</div>
        <h1 className="text-2xl font-bold mt-1">{data.paper_title}</h1>
        <p className="text-sm text-gray-400 mt-3 whitespace-pre-wrap">{data.paper_abstract}</p>
        <p className="text-xs text-gray-500 mt-3">Double-blind: author names, affiliations, and contact details are not shown.</p>
      </header>
      <section className="bg-[#18181b] border border-white/10 rounded-2xl p-5 space-y-4">
        <div><h2 className="text-lg font-semibold">Review form</h2><p className="text-xs text-gray-500">Save a draft any time. A submitted review is locked; ratings use a 1–5 scale.</p></div>
        {fields.map(([key, label, help]) => <label key={key} className="block"><span className="text-sm font-medium">{label}</span><span className="block text-xs text-gray-500 mb-1">{help}</span><textarea disabled={locked} rows={key === 'summary' ? 3 : 4} maxLength={12000} value={form[key]} onChange={(e) => change(key, e.target.value)} className="w-full bg-[#121214] border border-white/10 rounded-xl p-3 text-white disabled:opacity-60" /></label>)}
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="text-sm">Overall rating<select disabled={locked} value={form.rating} onChange={(e) => change('rating', e.target.value)} className="mt-1 block w-full bg-[#121214] border border-white/10 rounded-xl p-2"><option value="">Choose…</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {['Strong reject','Reject','Borderline','Accept','Strong accept'][n-1]}</option>)}</select></label>
          <label className="text-sm">Confidence<select disabled={locked} value={form.confidence} onChange={(e) => change('confidence', e.target.value)} className="mt-1 block w-full bg-[#121214] border border-white/10 rounded-xl p-2"><option value="">Choose…</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
          <label className="text-sm">Recommendation<select disabled={locked} value={form.recommendation} onChange={(e) => change('recommendation', e.target.value)} className="mt-1 block w-full bg-[#121214] border border-white/10 rounded-xl p-2"><option value="">Choose…</option><option value="accept">Accept</option><option value="weak_accept">Weak accept</option><option value="borderline">Borderline</option><option value="weak_reject">Weak reject</option><option value="reject">Reject</option></select></label>
        </div>
        {notice && <p className="text-sm text-green-300">{notice}</p>}
        {saveMutation.isError && <p className="text-sm text-red-400">{saveMutation.error?.response?.data?.detail || 'Save failed.'}</p>}
        {!locked && <div className="flex gap-2"><button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate(false)} className="px-4 py-2 rounded-xl border border-white/15 hover:bg-white/5 disabled:opacity-50">Save draft</button><button type="button" disabled={saveMutation.isPending} onClick={() => { if (window.confirm('Submit your review? Submitted reviews cannot be edited.')) saveMutation.mutate(true); }} className="px-4 py-2 rounded-xl bg-[#ff5c35] disabled:opacity-50">Submit review</button></div>}
        {locked && <p className="text-sm text-green-300">Submitted {data.submitted_at ? `on ${new Date(data.submitted_at).toLocaleString()}` : ''}</p>}
      </section>
      <DiscussionPanel paperId={paperId} />
    </div>
  );
}
