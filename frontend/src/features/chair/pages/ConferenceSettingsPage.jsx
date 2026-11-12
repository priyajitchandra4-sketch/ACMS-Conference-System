
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Building2, CalendarDays, MapPin, Plus, Save, ArrowUpRight,
  Layers3, CheckCircle2, Settings
} from 'lucide-react';
import { conferencesApi } from '../../../api/conferences';
import { apiError } from '../../../utils/apiError';

const FONT = { fontFamily: 'Arial, Helvetica, sans-serif' };
const inputCls =
  'w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100';
const labelCls = 'mb-2 block text-sm font-bold text-slate-700';
const emptyForm = { title: '', acronym: '', start_date: '', end_date: '', location: '' };

export default function ConferenceSettingsPage() {
  const { conferenceId } = useParams();
  const isEdit = Boolean(conferenceId && /^\d+$/.test(conferenceId));
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [conferences, setConferences] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError('');
    setSuccess('');
    if (isEdit) {
      conferencesApi
        .getById(conferenceId)
        .then((c) =>
          setForm({
            title: c.title,
            acronym: c.acronym,
            start_date: c.start_date.slice(0, 10),
            end_date: c.end_date.slice(0, 10),
            location: c.location || '',
          })
        )
        .catch((err) => setError(apiError(err, 'Could not load this conference.')));
    } else {
      setForm(emptyForm);
      conferencesApi
        .list()
        .then(setConferences)
        .catch((err) => setError(apiError(err, 'Could not load conferences.')));
    }
  }, [conferenceId, isEdit]);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const payload = {
      title: form.title,
      acronym: form.acronym,
      location: form.location,
      start_date: `${form.start_date}T00:00:00`,
      end_date: `${form.end_date}T23:59:00`,
    };

    try {
      if (isEdit) {
        await conferencesApi.update(conferenceId, payload);
        setSuccess('Conference updated.');
      } else {
        const created = await conferencesApi.create(payload);
        navigate(`/chair/conferences/${created.id}/deadlines`);
      }
    } catch (err) {
      setError(apiError(err, 'Failed to save conference.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={FONT} className="space-y-7 text-slate-900">
      <header className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 px-6 py-8 text-white shadow-xl shadow-indigo-200 sm:px-9 sm:py-10">
        <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <div className="absolute -bottom-28 right-32 h-64 w-64 rounded-full bg-fuchsia-400/15" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-indigo-50">
            <Layers3 size={14} /> CHAIR WORKSPACE
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {isEdit ? 'Conference settings' : 'Conferences'}
          </h1>
          <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-indigo-100 sm:text-base">
            {isEdit
              ? 'Update the core metadata, dates, and location details of this conference.'
              : 'Open an existing conference to manage its schedule and committee, or create a new one.'}
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

      {!isEdit && conferences.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Your conferences</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">Select a conference to manage deadlines, tracks, and reviewers.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {conferences.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => navigate(`/chair/conferences/${c.id}/deadlines`)}
                className="group flex items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/60 cursor-pointer"
              >
                <div className="min-w-0">
                  <span className="inline-block rounded-lg bg-indigo-50 px-3 py-1 font-mono text-xs font-bold text-indigo-700">
                    {c.acronym}
                  </span>
                  <p className="mt-2.5 truncate text-base font-extrabold text-slate-900 group-hover:text-indigo-700">
                    {c.title}
                  </p>
                </div>
                <span className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-500 transition group-hover:border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white">
                  <ArrowUpRight size={18} />
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
            {isEdit ? <Settings size={21} /> : <Building2 size={21} />}
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              {isEdit ? 'Edit details' : 'Create a new conference'}
            </h2>
            <p className="mt-0.5 text-sm font-medium text-slate-500">
              {isEdit ? 'Changes apply immediately across public pages' : 'Configure basic information to launch your workspace'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
          <div>
            <label htmlFor="conf-title" className={labelCls}>Title</label>
            <input
              id="conf-title"
              name="title"
              required
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. International Conference on Machine Learning"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="conf-acronym" className={labelCls}>Acronym</label>
            <input
              id="conf-acronym"
              name="acronym"
              required
              value={form.acronym}
              onChange={handleChange}
              placeholder="e.g. ICML-2026"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="conf-start" className={labelCls}>
                <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} className="text-indigo-500" /> Start date</span>
              </label>
              <input
                id="conf-start"
                type="date"
                name="start_date"
                required
                value={form.start_date}
                onChange={handleChange}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="conf-end" className={labelCls}>
                <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} className="text-indigo-500" /> End date</span>
              </label>
              <input
                id="conf-end"
                type="date"
                name="end_date"
                required
                value={form.end_date}
                onChange={handleChange}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label htmlFor="conf-location" className={labelCls}>
              <span className="inline-flex items-center gap-1.5"><MapPin size={14} className="text-indigo-500" /> Location</span>
            </label>
            <input
              id="conf-location"
              name="location"
              required
              value={form.location}
              onChange={handleChange}
              placeholder="e.g. Kolkata, India"
              className={inputCls}
            />
          </div>

          <div className="border-t border-slate-100 pt-5">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {isEdit ? <Save size={17} /> : <Plus size={18} strokeWidth={2.6} />}
              {loading ? 'Saving...' : isEdit ? 'Save changes' : 'Create conference'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}