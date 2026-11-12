import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentsApi } from '../../../api/assignments';

const BID_BADGE = {
  want: 'bg-green-500/15 text-green-300 border-green-500/30',
  maybe: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  no: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
};

const STATUS_BADGE = {
  pending: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  accepted: 'bg-green-500/15 text-green-300 border-green-500/30',
  declined: 'bg-red-500/15 text-red-300 border-red-500/30',
};

export default function AssignReviewersPage() {
  const { paperId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');

  const candidatesQuery = useQuery({
    queryKey: ['candidates', paperId],
    queryFn: () => assignmentsApi.getCandidates(paperId),
  });

  const assignedQuery = useQuery({
    queryKey: ['paper-assignments', paperId],
    queryFn: () => assignmentsApi.getPaperAssignments(paperId),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['candidates', paperId] });
    queryClient.invalidateQueries({ queryKey: ['paper-assignments', paperId] });
    queryClient.invalidateQueries({ queryKey: ['meta', 'papers'] });
    queryClient.invalidateQueries({ queryKey: ['track-overview'] });
  };

  const assignMutation = useMutation({
    mutationFn: (reviewerId) =>
      assignmentsApi.assignReviewer(
        paperId,
        reviewerId,
        dueDate ? new Date(dueDate).toISOString() : null
      ),
    onSuccess: () => {
      setError('');
      refresh();
    },
    onError: (err) => setError(err?.response?.data?.detail || 'Assignment failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: assignmentsApi.cancelAssignment,
    onSuccess: () => {
      setError('');
      refresh();
    },
    onError: (err) => setError(err?.response?.data?.detail || 'Could not remove'),
  });

  if (candidatesQuery.isLoading || assignedQuery.isLoading) {
    return <p className="p-6 text-gray-400">Loading…</p>;
  }

  if (candidatesQuery.isError) {
    return (
      <p className="p-6 text-red-400">
        Failed to load: {candidatesQuery.error?.response?.data?.detail || candidatesQuery.error.message}
      </p>
    );
  }

  const candidates = candidatesQuery.data || [];
  const assigned = assignedQuery.data || [];

  return (
    <div className="p-6 text-white">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-[#ff5c35] hover:underline text-sm"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold mt-2 mb-1">Assign Reviewers</h1>
      <p className="text-gray-400 mb-4">
        Bids, expertise and conflicts side by side. Authors of this paper and reviewers
        with declared conflicts cannot be assigned — the server enforces this.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-gray-400">Review due date (optional):</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="bg-[#18181b] border border-white/10 rounded-xl px-2 py-1 text-white"
        />
        <span className="text-xs text-gray-500">Defaults to 14 days from assignment</span>
      </div>

      {error && <p className="mb-3 text-red-400">{error}</p>}

      <h2 className="font-semibold mb-2">Assigned ({assigned.length})</h2>
      {assigned.length === 0 ? (
        <p className="text-gray-500 text-sm mb-6">No reviewers assigned yet.</p>
      ) : (
        <div className="bg-[#18181b] border border-white/10 rounded-2xl divide-y divide-white/10 mb-6">
          {assigned.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between px-4 py-3 gap-2"
            >
              <div>
                <span className="font-medium">{a.reviewer_name}</span>
                <span className="text-sm text-gray-500 ml-2">{a.anon_label}</span>
                <div className="text-xs text-gray-500">
                  Due {a.due_at ? new Date(a.due_at).toLocaleDateString() : '—'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full border capitalize ${
                    STATUS_BADGE[a.status] || STATUS_BADGE.declined
                  }`}
                >
                  {a.status}
                </span>
                {a.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => cancelMutation.mutate(a.id)}
                    disabled={cancelMutation.isPending}
                    className="text-sm text-red-400 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="font-semibold mb-2">Candidates</h2>
      <div className="bg-[#18181b] border border-white/10 rounded-2xl overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-gray-400">
            <tr>
              <th className="px-4 py-3">Reviewer</th>
              <th className="px-4 py-3">Bid</th>
              <th className="px-4 py-3">Expertise</th>
              <th className="px-4 py-3">Conflict</th>
              <th className="px-4 py-3">Load</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {candidates.map((c) => {
              const blocked = c.is_author || !!c.conflict;
              return (
                <tr key={c.user_id} className={blocked ? 'bg-red-500/5' : 'hover:bg-white/5'}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.full_name}</div>
                    <div className="text-xs text-gray-500">{c.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {c.bid ? (
                      <span
                        className={`text-xs px-2 py-1 rounded-full border capitalize ${BID_BADGE[c.bid]}`}
                      >
                        {c.bid}
                      </span>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-yellow-300">
                    {c.expertise_score > 0 ? '★'.repeat(Math.min(c.expertise_score, 5)) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {c.is_author ? (
                      <span className="text-red-400 text-xs font-medium">
                        Author of this paper
                      </span>
                    ) : c.conflict ? (
                      <span className="text-red-400 text-xs" title={c.conflict}>
                        Declared conflict
                      </span>
                    ) : (
                      <span className="text-gray-500">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{c.active_load}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={blocked || assignMutation.isPending}
                      onClick={() => assignMutation.mutate(c.user_id)}
                      className="px-3 py-1.5 rounded-lg bg-[#ff5c35] text-white text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                      title={blocked ? 'Cannot assign: author or conflict' : 'Assign this reviewer'}
                    >
                      Assign
                    </button>
                  </td>
                </tr>
              );
            })}
            {candidates.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-gray-500 text-center">
                  No candidates left. Invite more reviewers from the Track Chair's Invite
                  Reviewers page.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
