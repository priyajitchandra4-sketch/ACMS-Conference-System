import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { reviewsApi } from '../../../api/reviews';
import DiscussionPanel from '../../shared/discussion/DiscussionPanel';

export default function ManagerReviewsPage() {
  const { paperId } = useParams();
  const query = useQuery({ queryKey: ['paper-reviews', paperId], queryFn: () => reviewsApi.getForManager(paperId) });
  if (query.isLoading) return <p className="p-6 text-gray-400">Loading reviews…</p>;
  if (query.isError) return <p className="p-6 text-red-400">{query.error?.response?.data?.detail || 'Could not load reviews.'}</p>;
  const reviews = query.data || [];
  return <div className="p-6 max-w-5xl mx-auto text-white space-y-5">
    <Link to="/meta/papers" className="text-sm text-[#ff5c35] hover:underline">← My papers</Link>
    <header><h1 className="text-2xl font-bold">Review reports</h1><p className="text-sm text-gray-400">Reviewer identities remain hidden. Confidential notes are intended for Meta-Reviewers and authorized chairs.</p></header>
    <div className="space-y-3">{reviews.map((review) => <article key={review.assignment_id} className="bg-[#18181b] border border-white/10 rounded-2xl p-5">
      <div className="flex justify-between gap-3"><h2 className="font-semibold">{review.anon_label}</h2><span className={`text-xs px-2 py-1 rounded-full border ${review.status === 'submitted' ? 'text-green-300 border-green-500/30 bg-green-500/10' : 'text-yellow-300 border-yellow-500/30 bg-yellow-500/10'}`}>{review.status.replace('_',' ')}</span></div>
      {review.status !== 'not_started' ? <>
        <p className="text-sm text-gray-400 mt-3">Rating: {review.rating ?? '—'} / 5 · Confidence: {review.confidence ?? '—'} / 5 · Recommendation: {(review.recommendation || '—').replace('_',' ')}</p>
        {[['Summary', review.summary], ['Strengths', review.strengths], ['Weaknesses', review.weaknesses], ['Questions', review.questions], ['Confidential note', review.confidential_comments]].map(([label, value]) => value && <section key={label} className="mt-3"><h3 className="text-xs uppercase tracking-wide text-gray-500">{label}</h3><p className="text-sm text-gray-200 whitespace-pre-wrap mt-1">{value}</p></section>)}
      </> : <p className="text-sm text-gray-500 mt-3">No review submitted yet.</p>}
    </article>)}{reviews.length === 0 && <p className="text-gray-500">No accepted or pending reviewer assignments.</p>}</div>
    <DiscussionPanel paperId={paperId} />
  </div>;
}
