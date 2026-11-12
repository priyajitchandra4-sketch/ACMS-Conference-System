import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentsApi } from '../../../api/assignments';

export default function AssignmentsManagerPage() {
  const queryClient = useQueryClient();
  const [trackId, setTrackId] = useState(null);
  const [metaChoice, setMetaChoice] = useState({});
  const [error, setError] = useState('');

  const tracksQuery = useQuery({
    queryKey: ['tracks', 'mine'],
    queryFn: assignmentsApi.getMyTracks,
  });

  useEffect(() => {
    if (!trackId && tracksQuery.data?.length) {
      setTrackId(tracksQuery.data[0].id);
    }
  }, [tracksQuery.data, trackId]);

  const overviewQuery = useQuery({
    queryKey: ['track-overview', trackId],
    queryFn: () => assignmentsApi.getTrackOverview(trackId),
    enabled: !!trackId,
  });

  const metasQuery = useQuery({
    queryKey: ['track-members', trackId, 'meta_reviewer'],
    queryFn: () => assignmentsApi.getTrackMembers(trackId, 'meta_reviewer'),
    enabled: !!trackId,
  });

  const assignMetaMutation = useMutation({
    mutationFn: ({ paperId, metaId }) => assignmentsApi.assignMeta(paperId, metaId),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['track-overview', trackId] });
    },
    onError: (err) => setError(err?.response?.data?.detail || 'Assignment failed'),
  });

  if (tracksQuery.isLoading) {
    return <p className="p-6 text-gray-400">Loading tracks…</p>;
  }

  if (tracksQuery.isError) {
    return (
      <p className="p-6 text-red-400">
        Failed to load: {tracksQuery.error?.response?.data?.detail || tracksQuery.error.message}
      </p>
    );
  }

  const tracks = tracksQuery.data || [];
  const papers = overviewQuery.data || [];
  const metas = metasQuery.data || [];

  if (tracks.length === 0) {
    return (
      <div className="p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Assignments Manager</h1>
        <p className="text-gray-500">You are not a Track Chair of any track yet.</p>
      </div>
    );
  }

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-1">Assignments Manager</h1>
      <p className="text-gray-400 mb-4">
        Assign Meta-Reviewers to papers. They then assign the reviewers.
      </p>

      <div className="flex gap-2 mb-4 flex-wrap">
        {tracks.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTrackId(t.id)}
            className={`px-4 py-2 rounded-xl border transition ${
              trackId === t.id
                ? 'bg-[#ff5c35] text-white border-[#ff5c35]'
                : 'bg-[#18181b] border-white/10 hover:bg-white/5'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-red-400">{error}</p>}
      {overviewQuery.isLoading && <p className="text-gray-500">Loading papers…</p>}

      <div className="bg-[#18181b] border border-white/10 rounded-2xl overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-gray-400">
            <tr>
              <th className="px-4 py-3">Paper</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Meta-Reviewers</th>
              <th className="px-4 py-3">Reviewers (acc / pend / decl)</th>
              <th className="px-4 py-3">Assign Meta-Reviewer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {papers.map((p) => (
              <tr key={p.paper_id} className="hover:bg-white/5 align-top">
                <td className="px-4 py-3 text-gray-500">{p.paper_number}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{p.title}</div>
                  <span className="text-xs bg-[#ff5c35]/10 text-[#ff5c35] border border-[#ff5c35]/30 px-2 py-0.5 rounded-full capitalize">
                    {p.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {p.meta_reviewers.length === 0 ? (
                    <span className="text-gray-500">None</span>
                  ) : (
                    p.meta_reviewers.map((m) => <div key={m.user_id}>{m.full_name}</div>)
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-green-400">{p.accepted}</span>
                  {' / '}
                  <span className="text-yellow-300">{p.pending}</span>
                  {' / '}
                  <span className="text-red-400">{p.declined}</span>
                  <div className="mt-1">
                    <div className="flex flex-col gap-1">
                      <Link
                        to={`/meta/papers/${p.paper_id}/assign-reviewers`}
                        className="text-[#ff5c35] hover:underline text-xs"
                      >
                        Manage reviewers →
                      </Link>
                      <Link to={`/meta/papers/${p.paper_id}/reviews`} className="text-gray-400 hover:underline text-xs">
                        Reviews & discussion →
                      </Link>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <select
                      className="bg-[#121214] border border-white/10 rounded-lg px-2 py-1 text-sm text-white"
                      value={metaChoice[p.paper_id] || ''}
                      onChange={(e) =>
                        setMetaChoice((prev) => ({ ...prev, [p.paper_id]: e.target.value }))
                      }
                    >
                      <option value="">Choose…</option>
                      {metas.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.full_name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!metaChoice[p.paper_id] || assignMetaMutation.isPending}
                      onClick={() =>
                        assignMetaMutation.mutate({
                          paperId: p.paper_id,
                          metaId: Number(metaChoice[p.paper_id]),
                        })
                      }
                      className="px-3 py-1 rounded-lg bg-[#ff5c35] text-white text-sm disabled:opacity-40"
                    >
                      Assign
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {papers.length === 0 && !overviewQuery.isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-gray-500 text-center">
                  No submitted papers in this track yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
