import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { decisionsApi } from '../../../api/decisions';
import { ErrorMessage, Loading, PageTitle, Panel, StatusPill } from '../../shared/PhaseUi';

export default function AuthorDecisionsPage() {
  const query = useQuery({ queryKey: ['author-decisions'], queryFn: decisionsApi.myDecisions });
  if (query.isLoading) return <Loading label="Loading your decisions…" />;
  if (query.isError) return <div className="p-6"><ErrorMessage error={query.error} /></div>;
  const rows = query.data || [];
  return <div className="p-6 text-white"><PageTitle title="Decisions and next steps" subtitle="View decision letters, submit a rebuttal if the conference allows it, and upload the final version when invited." /><div className="space-y-3">{rows.map(p => <Panel key={p.paper_id}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs text-gray-500">{p.paper_number}</div><h2 className="font-semibold mt-1">{p.title}</h2><p className="text-sm text-gray-400 mt-2">{p.rationale || 'No decision letter is available yet.'}</p></div><StatusPill value={p.decision || 'pending'} /></div><div className="flex flex-wrap gap-4 mt-4 text-sm"><Link className="text-[#ff8b6e] hover:underline" to={`/author/papers/${p.paper_id}/decision`}>Decision and rebuttal</Link>{p.camera_ready_open && <Link className="text-[#ff8b6e] hover:underline" to={`/author/papers/${p.paper_id}/camera-ready`}>Camera-ready upload</Link>}</div></Panel>)}{!rows.length && <Panel><p className="text-gray-500">No decision letters are available for your papers yet.</p></Panel>}</div></div>;
}
