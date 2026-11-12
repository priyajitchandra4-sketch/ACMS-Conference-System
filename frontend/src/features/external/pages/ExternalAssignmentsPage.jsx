import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { externalApi } from '../../../api/external';
import { ActionButton, ErrorMessage, Loading, PageTitle, Panel, StatusPill } from '../../shared/PhaseUi';

export default function ExternalAssignmentsPage() {
  const qc = useQueryClient(); const query = useQuery({ queryKey: ['external-assignments'], queryFn: externalApi.assignments });
  const respond = useMutation({ mutationFn: ({ id, accept }) => accept ? externalApi.accept(id) : externalApi.decline(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['external-assignments'] }) });
  if (query.isLoading) return <Loading label="Loading external review invitations…" />;
  if (query.isError) return <div className="p-6"><ErrorMessage error={query.error} /></div>;
  const rows = query.data || [];
  return <div className="p-6 text-white"><PageTitle eyebrow="Phase 8 · External reviewer" title="External review assignments" subtitle="Review invitations and assigned papers. Author identities are hidden; only paper title and abstract should be provided by the backend." />{respond.isError && <div className="mb-4"><ErrorMessage error={respond.error} /></div>}<div className="space-y-3">{rows.map(a => <Panel key={a.assignment_id || a.id}><div className="flex flex-wrap justify-between gap-3"><div><div className="text-xs text-gray-500">{a.paper_number} · Due {a.due_at ? new Date(a.due_at).toLocaleDateString() : '—'}</div><h2 className="font-semibold mt-1">{a.paper_title}</h2><p className="text-sm text-gray-400 mt-2 line-clamp-3">{a.paper_abstract}</p></div><div className="flex flex-col items-end gap-2"><StatusPill value={a.status} />{a.status === 'pending' && <div className="flex gap-2"><ActionButton variant="secondary" busy={respond.isPending} onClick={() => respond.mutate({ id: a.assignment_id || a.id, accept: false })}>Decline</ActionButton><ActionButton busy={respond.isPending} onClick={() => respond.mutate({ id: a.assignment_id || a.id, accept: true })}>Accept</ActionButton></div>}{a.status === 'accepted' && <Link to={`/external/reviews/${a.paper_id}`} className="text-sm text-[#ff8b6e] hover:underline">Open external review →</Link>}</div></div></Panel>)}{!rows.length && <Panel><p className="text-gray-500">No external review invitations right now.</p></Panel>}</div></div>;
}
