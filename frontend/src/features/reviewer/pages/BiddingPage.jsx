import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { biddingApi } from '../../../api/bidding';

const BID_STYLES = {
  want: 'bg-green-600 text-white border-green-600',
  maybe: 'bg-yellow-500 text-white border-yellow-500',
  no: 'bg-gray-600 text-white border-gray-600',
};

function BidButtons({ paper, onBid, busy }) {
  return (
    <div className="flex gap-1">
      {['want', 'maybe', 'no'].map((v) => (
        <button
          key={v}
          type="button"
          disabled={busy}
          onClick={() => onBid(paper.id, v)}
          className={`px-2 py-1 rounded-lg text-sm capitalize border transition ${
            paper.my_bid === v
              ? BID_STYLES[v]
              : 'bg-transparent border-white/15 text-gray-300 hover:bg-white/5'
          } disabled:opacity-50`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

export default function BiddingPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [trackFilter, setTrackFilter] = useState('all');
  const [bidFilter, setBidFilter] = useState('all');
  const [conflictPaper, setConflictPaper] = useState(null);
  const [conflictReason, setConflictReason] = useState('');
  const [error, setError] = useState('');

  const papersQuery = useQuery({
    queryKey: ['bidding', 'papers'],
    queryFn: biddingApi.getPapers,
  });

  const bidMutation = useMutation({
    mutationFn: ({ paperId, value }) => biddingApi.placeBid(paperId, value),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['bidding', 'papers'] });
    },
    onError: (err) => setError(err?.response?.data?.detail || 'Could not save bid'),
  });

  const conflictMutation = useMutation({
    mutationFn: ({ paperId, reason }) => biddingApi.declareConflict(paperId, reason),
    onSuccess: () => {
      setConflictPaper(null);
      setConflictReason('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['bidding', 'papers'] });
    },
    onError: (err) => setError(err?.response?.data?.detail || 'Could not declare conflict'),
  });

  const papers = papersQuery.data || [];

  const tracks = useMemo(
    () => [...new Map(papers.map((p) => [p.track_id, p.track_name])).entries()],
    [papers]
  );

  const filtered = papers.filter((p) => {
    const text = `${p.title} ${p.abstract || ''}`.toLowerCase();
    if (search && !text.includes(search.toLowerCase())) return false;
    if (trackFilter !== 'all' && String(p.track_id) !== trackFilter) return false;
    if (bidFilter === 'unbid' && p.my_bid) return false;
    if (bidFilter !== 'all' && bidFilter !== 'unbid' && p.my_bid !== bidFilter) return false;
    return true;
  });

  if (papersQuery.isLoading) {
    return <p className="p-6 text-gray-400">Loading papers…</p>;
  }

  if (papersQuery.isError) {
    return (
      <p className="p-6 text-red-400">
        Failed to load: {papersQuery.error?.response?.data?.detail || papersQuery.error.message}
      </p>
    );
  }

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-1">Bidding</h1>
      <p className="text-gray-400 mb-4">
        Papers are shown double-blind: titles and abstracts only. Bid on the papers you
        want to review, or declare a conflict of interest.
      </p>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search title or abstract…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[#18181b] border border-white/10 rounded-xl px-3 py-2 w-64 text-white placeholder-gray-500"
        />
        <select
          value={trackFilter}
          onChange={(e) => setTrackFilter(e.target.value)}
          className="bg-[#18181b] border border-white/10 rounded-xl px-3 py-2 text-white"
        >
          <option value="all">All tracks</option>
          {tracks.map(([id, name]) => (
            <option key={id} value={String(id)}>
              {name || `Track ${id}`}
            </option>
          ))}
        </select>
        <select
          value={bidFilter}
          onChange={(e) => setBidFilter(e.target.value)}
          className="bg-[#18181b] border border-white/10 rounded-xl px-3 py-2 text-white"
        >
          <option value="all">All papers</option>
          <option value="unbid">Not yet bid</option>
          <option value="want">Bid: want</option>
          <option value="maybe">Bid: maybe</option>
          <option value="no">Bid: no</option>
        </select>
      </div>

      {error && <p className="mb-3 text-red-400">{error}</p>}

      {filtered.length === 0 && (
        <p className="text-gray-500">
          No papers match. Papers appear here after authors submit them.
        </p>
      )}

      <div className="space-y-3">
        {filtered.map((paper) => (
          <div
            key={paper.id}
            className="bg-[#18181b] border border-white/10 rounded-2xl p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-64">
                <div className="text-sm text-gray-500">
                  {paper.paper_number} · {paper.track_name}
                </div>
                <h2 className="font-semibold text-lg">{paper.title}</h2>
                <p className="text-gray-400 text-sm mt-1 line-clamp-3">{paper.abstract}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {paper.subject_areas.map((sa) => (
                    <span
                      key={sa}
                      className="text-xs bg-[#ff5c35]/10 text-[#ff5c35] border border-[#ff5c35]/30 px-2 py-0.5 rounded-full"
                    >
                      {sa}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <BidButtons
                  paper={paper}
                  busy={bidMutation.isPending}
                  onBid={(paperId, value) => bidMutation.mutate({ paperId, value })}
                />
                <button
                  type="button"
                  onClick={() => setConflictPaper(paper)}
                  className="text-sm text-red-400 hover:underline"
                >
                  Declare conflict
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {conflictPaper && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="font-bold text-lg mb-2">Declare conflict of interest</h2>
            <p className="text-sm text-gray-400 mb-3">
              “{conflictPaper.title}” — the paper will be hidden from your bidding list
              and you will not be assigned to it.
            </p>
            <textarea
              value={conflictReason}
              onChange={(e) => setConflictReason(e.target.value)}
              placeholder="Reason (e.g. same institution, former advisor, recent co-author)…"
              className="bg-[#121214] border border-white/10 rounded-xl w-full p-2 h-24 text-white placeholder-gray-500"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setConflictPaper(null);
                  setConflictReason('');
                }}
                className="px-4 py-2 rounded-xl border border-white/15 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={conflictReason.trim().length < 3 || conflictMutation.isPending}
                onClick={() =>
                  conflictMutation.mutate({
                    paperId: conflictPaper.id,
                    reason: conflictReason.trim(),
                  })
                }
                className="px-4 py-2 rounded-xl bg-red-600 text-white disabled:opacity-50"
              >
                {conflictMutation.isPending ? 'Declaring…' : 'Declare conflict'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
