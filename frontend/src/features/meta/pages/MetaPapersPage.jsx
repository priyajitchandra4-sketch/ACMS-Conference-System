import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { assignmentsApi } from '../../../api/assignments';

export default function MetaPapersPage() {
  const papersQuery = useQuery({
    queryKey: ['meta', 'papers'],
    queryFn: assignmentsApi.getMetaPapers,
  });

  if (papersQuery.isLoading) {
    return <p className="p-6 text-gray-400">Loading your papers…</p>;
  }

  if (papersQuery.isError) {
    return (
      <p className="p-6 text-red-400">
        Failed to load: {papersQuery.error?.response?.data?.detail || papersQuery.error.message}
      </p>
    );
  }

  const papers = papersQuery.data || [];

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-1">Papers Assigned to Me</h1>
      <p className="text-gray-400 mb-6">
        You are the Meta-Reviewer for these papers. Assign reviewers to each one.
      </p>

      {papers.length === 0 && (
        <p className="text-gray-500">
          No papers yet. The Track Chair assigns Meta-Reviewers in the Assignments
          Manager.
        </p>
      )}

      <div className="bg-[#18181b] border border-white/10 rounded-2xl overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-sm text-gray-400">
            <tr>
              <th className="px-4 py-3">Paper</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Reviewers</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {papers.map((p) => (
              <tr key={p.paper_id} className="hover:bg-white/5">
                <td className="px-4 py-3 text-sm text-gray-500">{p.paper_number}</td>
                <td className="px-4 py-3 font-medium">{p.title}</td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-[#ff5c35]/10 text-[#ff5c35] border border-[#ff5c35]/30 px-2 py-1 rounded-full capitalize">
                    {p.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-300">
                  {p.reviewers_accepted}/{p.reviewers_total} accepted
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <Link
                      to={`/meta/papers/${p.paper_id}/assign-reviewers`}
                      className="text-[#ff5c35] hover:underline text-sm"
                    >
                      Assign reviewers →
                    </Link>
                    <Link
                      to={`/meta/papers/${p.paper_id}/reviews`}
                      className="text-gray-300 hover:text-white hover:underline text-sm"
                    >
                      Read reviews & discussion →
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {papers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-gray-500 text-center">
                  No papers assigned to you yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
