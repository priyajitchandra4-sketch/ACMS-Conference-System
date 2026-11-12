import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Plus, Eye, Pencil, CalendarDays, Clock3, CheckCircle2,
  FilePlus2, X, ArrowUpRight, Search, Layers3
} from 'lucide-react';
import { papersApi } from '../../../api/papers';
import client from '../../../api/client';

const FONT = { fontFamily: 'Arial, Helvetica, sans-serif' };

function formatTimestamp(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function StatusPill({ status }) {
  const draft = status === 'draft';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold capitalize ${
      draft ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${draft ? 'bg-amber-500' : 'bg-emerald-500'}`} />
      {status || 'Unknown'}
    </span>
  );
}

export default function MyPapersPage() {
  const [papers, setPapers] = useState([]);
  const [conferences, setConferences] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedConferenceId, setSelectedConferenceId] = useState('');
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    Promise.all([papersApi.listMine(), client.get('/conferences/public/open')])
      .then(([papersData, conferencesResponse]) => {
        if (!active) return;
        setPapers(Array.isArray(papersData) ? papersData : []);
        setConferences(Array.isArray(conferencesResponse.data) ? conferencesResponse.data : []);
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.detail || 'Failed to load submissions.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const selected = conferences.find((conference) => String(conference.id) === String(selectedConferenceId));
    setTracks(selected?.tracks || []);
    setSelectedTrackId('');
  }, [selectedConferenceId, conferences]);

  const filteredPapers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return papers;
    return papers.filter((paper) =>
      [paper.title, paper.paper_number, paper.status]
        .filter(Boolean).some((value) => String(value).toLowerCase().includes(query))
    );
  }, [papers, search]);

  const draftCount = papers.filter((paper) => paper.status === 'draft').length;
  const submittedCount = papers.filter((paper) => paper.status !== 'draft').length;

  const handleOpenModal = () => {
    if (!conferences.length) {
      setError('There are no conferences currently accepting submissions.');
      return;
    }
    setError('');
    setSelectedConferenceId('');
    setSelectedTrackId('');
    setShowModal(true);
  };

  const handleCreateDraft = async (event) => {
    event.preventDefault();
    if (!selectedConferenceId || !selectedTrackId || creating) return;
    setCreating(true);
    setError('');
    try {
      const draft = await papersApi.createDraft({
        conference_id: Number(selectedConferenceId),
        track_id: Number(selectedTrackId),
        title: 'Untitled Research Paper',
        abstract: '',
        authors: [],
        subject_area_ids: [],
      });
      navigate(`/author/papers/${draft.id}?mode=edit`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create a new draft.');
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div style={FONT} className="flex min-h-[420px] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-white px-6 py-5 shadow-sm">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-bold text-slate-600">Loading your submissions…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={FONT} className="space-y-7 text-slate-900">
      <header className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 px-6 py-8 text-white shadow-xl shadow-indigo-200 sm:px-9 sm:py-10">
        <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <div className="absolute -bottom-28 right-32 h-64 w-64 rounded-full bg-fuchsia-400/15" />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-indigo-50">
              <Layers3 size={14} /> AUTHOR WORKSPACE
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">My Submissions</h1>
            <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-indigo-100 sm:text-base">
              Manage your research papers, continue draft edits, and review finalized submissions.
            </p>
          </div>
          <button type="button" onClick={handleOpenModal}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-extrabold text-indigo-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-50">
            <Plus size={19} strokeWidth={2.8} /> New submission
          </button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">{error}</div>}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-500">Total papers</span>
            <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><FileText size={19} /></span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">{papers.length}</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">Across your account</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-500">Drafts</span>
            <span className="rounded-xl bg-amber-50 p-2.5 text-amber-600"><Pencil size={19} /></span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">{draftCount}</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">Can still be edited</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-500">Submitted</span>
            <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><CheckCircle2 size={19} /></span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">{submittedCount}</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">Read-only submissions</p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Your research papers</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">Timestamps are shown in your local time.</p>
          </div>
          <label className="relative block w-full sm:max-w-xs">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)}
              placeholder="Search papers…" aria-label="Search submissions"
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
          </label>
        </div>

        {papers.length === 0 ? (
          <div className="rounded-[28px] border-2 border-dashed border-indigo-200 bg-white px-6 py-16 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><FilePlus2 size={30} /></span>
            <h3 className="mt-5 text-xl font-extrabold text-slate-900">No submissions yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">Start a draft by selecting an open conference and one of its available tracks.</p>
            <button type="button" onClick={handleOpenModal} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"><Plus size={17} /> Create your first draft</button>
          </div>
        ) : filteredPapers.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">No papers match “{search}”.</div>
        ) : (
          <div className="grid gap-4">
            {filteredPapers.map((paper) => {
              const isDraft = paper.status === 'draft';
              return (
                <article key={paper.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/60 sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-xs font-bold text-slate-600">{paper.paper_number || `PAPER-${paper.id}`}</span>
                        <StatusPill status={paper.status} />
                      </div>
                      <h3 className="mt-3 break-words text-lg font-extrabold leading-snug text-slate-900 sm:text-xl">{paper.title || 'Untitled Research Paper'}</h3>
                      <div className="mt-4 grid gap-3 text-xs font-semibold text-slate-500 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                          <CalendarDays size={15} className="mt-0.5 shrink-0 text-indigo-500" />
                          <span><span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Created</span><span className="mt-0.5 block text-slate-700">{formatTimestamp(paper.created_at)}</span></span>
                        </div>
                        <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                          <Clock3 size={15} className="mt-0.5 shrink-0 text-indigo-500" />
                          <span><span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Last updated</span><span className="mt-0.5 block text-slate-700">{formatTimestamp(paper.updated_at || paper.created_at)}</span></span>
                        </div>
                        {paper.submitted_at && <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5">
                          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                          <span><span className="block text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">Submitted</span><span className="mt-0.5 block text-emerald-800">{formatTimestamp(paper.submitted_at)}</span></span>
                        </div>}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-row gap-2 border-t border-slate-100 pt-4 lg:border-0 lg:pt-0">
                      <button type="button" onClick={() => navigate(`/author/papers/${paper.id}?mode=view`)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 lg:flex-none">
                        <Eye size={17} /> View
                      </button>
                      {isDraft && <button type="button" onClick={() => navigate(`/author/papers/${paper.id}?mode=edit`)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 lg:flex-none">
                        <Pencil size={16} /> Edit <ArrowUpRight size={15} />
                      </button>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="new-submission-title">
          <div className="w-full max-w-lg overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-start justify-between bg-gradient-to-r from-indigo-700 to-violet-600 p-6 text-white">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-100">New research paper</span>
                <h2 id="new-submission-title" className="mt-1 text-2xl font-extrabold">Choose a destination</h2>
                <p className="mt-1 text-sm font-medium text-indigo-100">Select an open conference and track.</p>
              </div>
              <button type="button" onClick={() => setShowModal(false)} aria-label="Close dialog" className="rounded-xl bg-white/15 p-2 text-white hover:bg-white/25"><X size={19} /></button>
            </div>
            <form onSubmit={handleCreateDraft} className="space-y-5 p-6">
              <div>
                <label htmlFor="conference-select" className="mb-2 block text-sm font-bold text-slate-700">Conference</label>
                <select id="conference-select" value={selectedConferenceId} onChange={(event) => setSelectedConferenceId(event.target.value)} required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100">
                  <option value="" disabled>Select conference…</option>
                  {conferences.map((conference) => <option key={conference.id} value={conference.id}>{conference.title || conference.name || `Conference #${conference.id}`}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="track-select" className="mb-2 block text-sm font-bold text-slate-700">Track</label>
                <select id="track-select" value={selectedTrackId} onChange={(event) => setSelectedTrackId(event.target.value)} disabled={!selectedConferenceId || !tracks.length} required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400">
                  <option value="" disabled>Select track…</option>
                  {tracks.map((track) => <option key={track.id} value={track.id}>{track.name}</option>)}
                </select>
                {selectedConferenceId && !tracks.length && <p className="mt-2 text-xs font-semibold text-amber-700">This conference currently has no open tracks.</p>}
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={!selectedConferenceId || !selectedTrackId || creating} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">
                  {creating ? 'Creating draft…' : <><Plus size={17} /> Create draft</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
