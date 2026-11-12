import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock3, CalendarPlus, ArrowLeft, Layers3, CheckCircle2, AlertCircle, CalendarDays
} from 'lucide-react';
import { conferencesApi } from '../../../api/conferences';
import { apiError } from '../../../utils/apiError';

const FONT = { fontFamily: 'Arial, Helvetica, sans-serif' };
const inputCls =
  'w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100';
const labelCls = 'mb-2 block text-sm font-bold text-slate-700';

const TYPE_LABELS = {
  submission: 'Submission',
  review: 'Review due',
  rebuttal: 'Rebuttal',
  camera_ready: 'Camera ready',
};

function deadlineState(d) {
  const now = Date.now();
  const due = new Date(d.due_at).getTime();
  const graceEnd = due + (d.grace_period_minutes || 0) * 60000;
  if (now <= due) return { text: 'Open', cls: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' };
  if (now <= graceEnd) return { text: 'Grace period', cls: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' };
  return { text: 'Closed', cls: 'bg-rose-100 text-rose-800', dot: 'bg-rose-500' };
}

export default function DeadlineManagerPage() {
  const { conferenceId } = useParams();
  const navigate = useNavigate();
  const validId = /^\d+$/.test(conferenceId || '');

  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    deadline_type: 'submission',
    due_at: '',
    grace_period_minutes: 0,
  });

  const loadDeadlines = async () => {
    try {
      setLoading(true);
      const data = await conferencesApi.listDeadlines(conferenceId);
      setDeadlines(data || []);
      setError('');
    } catch (err) {
      setError(apiError(err, 'Failed to load deadlines.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (validId) {
      loadDeadlines();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conferenceId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validId) {
      setError('Open or create a conference first.');
      return;
    }
    if (!formData.due_at) {
      setError('Choose a due date and time.');
      return;
    }

    try {
      await conferencesApi.setDeadline(conferenceId, {
        deadline_type: formData.deadline_type,
        due_at: new Date(formData.due_at).toISOString(),
        grace_period_minutes: Number(formData.grace_period_minutes) || 0,
      });
      setSuccess('Deadline saved.');
      setFormData({ deadline_type: 'submission', due_at: '', grace_period_minutes: 0 });
      loadDeadlines();
    } catch (err) {
      setError(apiError(err, 'Failed to save deadline.'));
    }
  };

  if (!validId) {
    return (
      <div style={FONT} className="flex min-h-[420px] items-center justify-center">
        <div className="w-full max-w-lg rounded-[28px] border-2 border-dashed border-indigo-200 bg-white px-6 py-14 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <AlertCircle size={28} />
          </span>
          <h2 className="mt-5 text-xl font-extrabold text-slate-900">Deadlines</h2>
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
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-indigo-50">
              <Layers3 size={14} /> CHAIR WORKSPACE
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Deadlines</h1>
            <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-indigo-100 sm:text-base">
              Set submission, review, rebuttal and camera-ready deadlines.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/chair/conferences')}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-extrabold text-white backdrop-blur-sm transition hover:bg-white/20 cursor-pointer"
          >
            <ArrowLeft size={17} /> All conferences
          </button>
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
            <CalendarPlus size={21} />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Add a deadline</h2>
            <p className="mt-0.5 text-sm font-medium text-slate-500">Configure milestone cutoffs and grace periods</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="deadline-type" className={labelCls}>Type</label>
              <select
                id="deadline-type"
                value={formData.deadline_type}
                onChange={(e) => setFormData({ ...formData, deadline_type: e.target.value })}
                className={inputCls}
              >
                <option value="submission">Submission</option>
                <option value="review">Review due</option>
                <option value="rebuttal">Rebuttal</option>
                <option value="camera_ready">Camera ready</option>
              </select>
            </div>

            <div>
              <label htmlFor="deadline-due" className={labelCls}>Due at (your local time)</label>
              <input
                id="deadline-due"
                type="datetime-local"
                value={formData.due_at}
                onChange={(e) => setFormData({ ...formData, due_at: e.target.value })}
                className={inputCls}
                required
              />
            </div>

            <div>
              <label htmlFor="deadline-grace" className={labelCls}>Grace period (minutes)</label>
              <input
                id="deadline-grace"
                type="number"
                min="0"
                value={formData.grace_period_minutes}
                onChange={(e) => setFormData({ ...formData, grace_period_minutes: e.target.value })}
                className={inputCls}
                required
              />
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-5">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 cursor-pointer"
            >
              <CalendarPlus size={17} /> Save deadline
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="rounded-2xl bg-violet-50 p-3 text-violet-600">
            <Clock3 size={21} />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Current deadlines</h2>
            <p className="mt-0.5 text-sm font-medium text-slate-500">Live status of configured milestones</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-slate-50 px-5 py-4">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              <p className="text-sm font-bold text-slate-600">Loading deadlines…</p>
            </div>
          </div>
        ) : deadlines.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-slate-50/70 p-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <CalendarDays size={24} />
            </span>
            <p className="mt-3 text-sm font-bold text-slate-600">
              No deadlines yet. Add the submission deadline first.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">Type</th>
                  <th className="px-6 py-3.5 text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">Due at</th>
                  <th className="px-6 py-3.5 text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">Grace period</th>
                  <th className="px-6 py-3.5 text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {deadlines.map((d) => {
                  const state = deadlineState(d);
                  return (
                    <tr key={d.id} className="transition hover:bg-slate-50/80">
                      <td className="px-6 py-4 text-sm font-extrabold text-slate-900">
                        {TYPE_LABELS[d.deadline_type] || d.deadline_type}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                        {new Date(d.due_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                        {d.grace_period_minutes} min
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${state.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />
                          {state.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}