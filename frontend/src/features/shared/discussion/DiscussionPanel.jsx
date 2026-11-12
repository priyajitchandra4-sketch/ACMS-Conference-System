import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '../../../api/reviews';

export default function DiscussionPanel({ paperId }) {
  const [body, setBody] = useState('');
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['discussion', paperId],
    queryFn: () => reviewsApi.getDiscussion(paperId),
  });
  const postMutation = useMutation({
    mutationFn: () => reviewsApi.postDiscussion(paperId, body),
    onSuccess: (data) => {
      setBody('');
      queryClient.setQueryData(['discussion', paperId], data);
    },
  });

  return (
    <section className="bg-[#18181b] border border-white/10 rounded-2xl p-5">
      <h2 className="text-lg font-semibold mb-1">Reviewer Discussion</h2>
      <p className="text-xs text-gray-500 mb-4">Names and contact details are hidden. Participants appear as anonymous role labels.</p>
      {query.isLoading ? <p className="text-gray-500">Loading discussion…</p> : query.isError ? (
        <p className="text-red-400">{query.error?.response?.data?.detail || 'Could not load discussion.'}</p>
      ) : (
        <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
          {(query.data?.posts || []).map((post) => (
            <article key={post.id} className="bg-white/[0.03] rounded-xl p-3">
              <div className="flex justify-between gap-3 text-xs text-gray-500 mb-1">
                <strong className="text-[#ff8b6e]">{post.author_label}</strong>
                <time>{new Date(post.created_at).toLocaleString()}</time>
              </div>
              <p className="text-sm text-gray-200 whitespace-pre-wrap">{post.body}</p>
            </article>
          ))}
          {query.data?.posts?.length === 0 && <p className="text-sm text-gray-500">No discussion posts yet.</p>}
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); if (body.trim()) postMutation.mutate(); }} className="space-y-2">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={10000} rows={3} placeholder="Add a constructive comment or question…" className="w-full bg-[#121214] border border-white/10 rounded-xl p-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#ff5c35]" />
        {postMutation.isError && <p className="text-sm text-red-400">{postMutation.error?.response?.data?.detail || 'Could not post.'}</p>}
        <button type="submit" disabled={!body.trim() || postMutation.isPending} className="px-4 py-2 rounded-xl bg-[#ff5c35] text-white text-sm disabled:opacity-40">{postMutation.isPending ? 'Posting…' : 'Post to discussion'}</button>
      </form>
    </section>
  );
}
