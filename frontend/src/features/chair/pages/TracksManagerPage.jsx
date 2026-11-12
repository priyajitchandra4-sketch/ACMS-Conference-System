import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FolderPlus, Layers3, ArrowLeft, AlertCircle, Tag, Plus
} from 'lucide-react';
import { conferencesApi } from '../../../api/conferences';
import { apiError } from '../../../utils/apiError';

const FONT = { fontFamily: 'Arial, Helvetica, sans-serif' };
const inputCls =
  'w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100';
const labelCls = 'mb-2 block text-sm font-bold text-slate-700';

export default function TracksManagerPage() {
  const { conferenceId } = useParams();
  const navigate = useNavigate();
  const validId = /^\d+$/.test(conferenceId || '');

  const [tracks, setTracks] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!validId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    conferencesApi
      .listTracks(conferenceId)
      .then((data) => {
        setTracks(data || []);
        setError('');
      })
      .catch((err) => setError(apiError(err, 'Failed to load tracks.')))
      .finally(() => setLoading(false));
  }, [conferenceId, validId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const newTrack = await conferencesApi.createTrack(conferenceId, { name, description });
      setTracks((prev) => [...prev, newTrack]);
      setName('');
      setDescription('');
    } catch (err) {
      setError(apiError(err, 'Failed to create track.'));
    } finally {
      setSaving(false);
    }
  };

  if (!validId) {
    return (
      <div style={FONT} className="flex min-h-[420px] items-center justify-center">
        <div className="w-full max-w-lg rounded-[28px] border-2 border-dashed border-indigo-200 bg-white px-6 py-14 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <AlertCircle size={28} />
          </span>
          <h2 className="mt-5 text-xl font-extrabold text-slate-900">Tracks</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-slate-500">
            No conference is selected. Open or create one first.
          </p>
          <button
            type="button"
            onClick={() => navigate('/chair/conferences')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 cursor-pointer"
          >
            <ArrowLeft size={16} /> Go to conferences
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={FONT} className="space-y-7 text-slate-900">
      <header className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 px-6 py-8 text-white shadow-xl shadow-indigo-200 sm:px-9 sm:py-10">
        <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <div className="absolute -bottom-28 right-32 h-64 w-64 rounded-full bg-fuchsia-400/15" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-indigo-50">
            <Layers3 size={14} /> CHAIR WORKSPACE
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Tracks</h1>
          <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-indigo-100 sm:text-base">
            Tracks group papers by topic. Authors choose one when they submit.
          </p>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
            <FolderPlus size={21} />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Add a track</h2>
            <p className="mt-0.5 text-sm font-medium text-slate-500">Define a subject track for incoming submissions</p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label htmlFor="track-name" className={labelCls}>Track name</label>
            <input
              id="track-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Machine Learning"
              className={inputCls}
              required
            />
          </div>
          <div>
            <label htmlFor="track-desc" className={labelCls}>Description</label>
            <textarea
              id="track-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What kinds of papers belong here?"
              className={`${inputCls} resize-y font-medium leading-6`}
            />
          </div>
          <div className="flex justify-end border-t border-slate-100 pt-5">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <Plus size={18} strokeWidth={2.6} />
              {saving ? 'Saving...' : 'Add track'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="rounded-2xl bg-violet-50 p-3 text-violet-600">
            <Tag size={21} />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Current tracks</h2>
            <p className="mt-0.5 text-sm font-medium text-slate-500">Available submission tracks in this conference</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-slate-50 px-5 py-4">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              <p className="text-sm font-bold text-slate-600">Loading tracks…</p>
            </div>
          </div>
        ) : tracks.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-slate-50/70 p-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Tag size={24} />
            </span>
            <p className="mt-3 text-sm font-bold text-slate-600">
              No tracks yet. Add the first one above.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {tracks.map((t) => (
              <li
                key={t.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition hover:border-indigo-200 hover:bg-white"
              >
                <p className="text-base font-extrabold text-slate-900">{t.name}</p>
                <p className="mt-1.5 text-sm font-medium leading-6 text-slate-600">
                  {t.description || 'No description yet.'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}