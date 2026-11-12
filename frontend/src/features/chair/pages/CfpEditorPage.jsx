import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText, Save, ArrowLeft, Layers3, CheckCircle2, AlertCircle
} from 'lucide-react';
import { conferencesApi } from '../../../api/conferences';
import { apiError } from '../../../utils/apiError';

const FONT = { fontFamily: 'Arial, Helvetica, sans-serif' };

export default function CfpEditorPage() {
  const { conferenceId } = useParams();
  const navigate = useNavigate();
  const validId = /^\d+$/.test(conferenceId || '');

  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!validId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    conferencesApi
      .getCfp(conferenceId)
      .then((res) => {
        setContent(res.content || '');
        setError('');
      })
      .catch((err) => setError(apiError(err, 'Failed to load the call for papers.')))
      .finally(() => setLoading(false));
  }, [conferenceId, validId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await conferencesApi.upsertCfp(conferenceId, content);
      setSuccess('Call for papers saved.');
    } catch (err) {
      setError(apiError(err, 'Failed to save the call for papers.'));
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
          <h2 className="mt-5 text-xl font-extrabold text-slate-900">Call for papers</h2>
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
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Call for papers</h1>
          <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-indigo-100 sm:text-base">
            Write the text authors will see on the public call-for-papers page.
          </p>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
            <FileText size={21} />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Public announcement editor</h2>
            <p className="mt-0.5 text-sm font-medium text-slate-500">Markdown formatting is supported</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="max-w-3xl space-y-5">
          <div>
            <label htmlFor="cfp-content" className="mb-2 block text-sm font-bold text-slate-700">
              Content (Markdown supported)
            </label>
            <textarea
              id="cfp-content"
              rows={14}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={loading}
              placeholder="Describe the topics, scope, important dates and submission guidelines."
              className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 font-mono text-sm leading-7 text-slate-800 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-500"
              required
            />
          </div>
          <div className="flex justify-end border-t border-slate-100 pt-5">
            <button
              type="submit"
              disabled={saving || loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <Save size={17} />
              {saving ? 'Saving...' : 'Save call for papers'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}