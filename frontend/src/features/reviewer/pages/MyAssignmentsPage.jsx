import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentsApi } from '../../../api/assignments';

const STATUS_STYLES = {
  pending: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  accepted: 'bg-green-500/15 text-green-300 border-green-500/30',
  declined: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
};

function dueText(dueAt) {
  if (!dueAt) return 'No due date';
  const due = new Date(dueAt);
  const days = Math.ceil((due - new Date()) / 86400000);
  const date = due.toLocaleDateString();
  if (days < 0) return `Overdue since ${date}`;
  if (days === 0) return 'Due today';
  return `Due ${date} (${days} day${days === 1 ? '' : 's'})`;
}

export default function MyAssignmentsPage() {
  const queryClient = useQueryClient();

  const assignmentsQuery = useQuery({
    queryKey: ['assignments', 'mine'],
    queryFn: assignmentsApi.getMine,
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, accept }) =>
      accept ? assignmentsApi.accept(id) : assignmentsApi.decline(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assignments', 'mine'] }),
  });

  if (assignmentsQuery.isLoading) {
    return <p className="p-6 text-gray-400">Loading assignments…</p>;
  }

  if (assignmentsQuery.isError) {
    return (
      <p className="p-6 text-red-400">
        Failed to load: {assignmentsQuery.error?.response?.data?.detail || assignmentsQuery.error.message}
      </p>
    );
  }

  const assignments = assignmentsQuery.data || [];

  return (
    <div className="p-6 max-w-3xl text-white">
      <h1 className="text-2xl font-bold mb-1">My Assignments</h1>
      <p className="text-gray-400 mb-6">
        Papers assigned to you for review. Accept or decline each invitation. Author
        identities are hidden (double-blind review).
      </p>

      {respondMutation.isError && (
        <p className="mb-3 text-red-400">
          {respondMutation.error?.response?.data?.detail || 'Action failed'}
        </p>
      )}

      {assignments.length === 0 && (
        <p className="text-gray-500">
          Nothing assigned yet. Set your expertise profile and bid on papers to help us
          match you.
        </p>
      )}

      <div className="space-y-3">
        {assignments.map((a) => (
          <div
            key={a.id}
            className="bg-[#18181b] border border-white/10 rounded-2xl p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm text-gray-500">
                  {a.paper_number} · You are “{a.anon_label}”
                </div>
                <h2 className="font-semibold">{a.paper_title}</h2>
                <div
                  className={`text-sm mt-1 ${
                    a.due_at && new Date(a.due_at) < new Date()
                      ? 'text-red-400'
                      : 'text-gray-500'
                  }`}
                >
                  {dueText(a.due_at)}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full border capitalize ${
                    STATUS_STYLES[a.status] || STATUS_STYLES.declined
                  }`}
                >
                  {a.status}
                </span>

                {a.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      disabled={respondMutation.isPending}
                      onClick={() => respondMutation.mutate({ id: a.id, accept: true })}
                      className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      disabled={respondMutation.isPending}
                      onClick={() => respondMutation.mutate({ id: a.id, accept: false })}
                      className="px-3 py-1.5 rounded-lg border border-white/15 text-sm hover:bg-white/5 disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                )}

                {a.status === 'accepted' && (
                  <Link to={`/reviewer/reviews/${a.paper_id}`} className="text-sm text-[#ff5c35] hover:underline">
                    Open review & discussion →
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
