import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../../../api/reports';
import { ErrorMessage, Loading, PageTitle, Panel, StatusPill } from '../../shared/PhaseUi';

const baseline = [
  ['Passwords','Store only strong salted password hashes; never expose password fields in API responses.'],
  ['Authorization','Enforce conference, track, and paper scope in backend services—not only in the UI.'],
  ['Double-blind','Do not return author or reviewer identities in blind-facing schemas.'],
  ['Uploads','Validate type/size, store outside public static paths, and authorize every download.'],
  ['Payments','Use provider-hosted checkout; never store card numbers or security codes.'],
  ['Audit','Record sensitive changes without logging credentials, tokens, or paper contents.'],
];
export default function SecurityOverviewPage() {
  const query = useQuery({ queryKey: ['security-overview'], queryFn: reportsApi.securityOverview });
  if (query.isLoading) return <Loading label="Loading security status…" />;
  if (query.isError) return <div className="p-6"><ErrorMessage error={query.error} /></div>;
  const checks = query.data?.checks || [];
  return <div className="p-6 max-w-5xl text-white"><PageTitle title="Security and privacy checklist" subtitle="Operational checklist and backend-reported status. A green UI status is not a substitute for server-side enforcement or a security review." /><div className="space-y-3">{baseline.map(([name, detail]) => { const status = checks.find(c => c.name?.toLowerCase() === name.toLowerCase())?.status || 'review required'; return <Panel key={name} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h2 className="font-semibold">{name}</h2><p className="text-sm text-gray-400 mt-1">{detail}</p></div><StatusPill value={status} /></Panel>; })}</div><p className="text-xs text-gray-500 mt-4">Last checked: {query.data?.checked_at ? new Date(query.data.checked_at).toLocaleString() : 'Not reported by the server yet.'}</p></div>;
}
