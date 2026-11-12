import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { conferencesApi } from '../../../api/conferences';
import { apiError } from '../../../utils/apiError';
import { parseUtc } from '../../../utils/dates';

const dateOnly = { day: 'numeric', month: 'short', year: 'numeric' };
const dateTime = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };

function isLong(text) {
  if (!text) return false;
  return text.length > 280 || text.split('\n').length > 6;
}

export default function CallForPapersPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    conferencesApi
      .listPublicCfps()
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
        setError('');
      })
      .catch((err) => setError(apiError(err, 'Could not load the calls for papers.')))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8 text-[#0f0e13]">
      <div className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight">Calls for papers</h1>
        <p className="text-sm font-extrabold text-gray-600">
          Read what each conference is asking for, then{' '}
          <Link to="/register" className="text-[#ff5c35] underline font-black hover:opacity-80">
            create an account
          </Link>{' '}
          to submit a paper.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border-2 border-red-300 text-red-700 text-xs font-bold rounded-2xl shadow-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center bg-[#f4f1ea] border-2 border-[#e5e2db] rounded-3xl animate-pulse">
          <p className="text-sm font-extrabold text-gray-500">Loading calls for papers...</p>
        </div>
      ) : items.length === 0 && !error ? (
        <div className="p-12 text-center bg-[#f4f1ea] border-2 border-dashed border-[#e5e2db] rounded-3xl space-y-2">
          <p className="text-base font-black text-[#0f0e13]">No active calls for papers</p>
          <p className="text-sm font-extrabold text-gray-600">
            No calls for papers have been published yet. Check back soon.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {items.map((c) => {
            const due = c.submission_deadline ? parseUtc(c.submission_deadline) : null;
            const closed = due ? due.getTime() < Date.now() : false;
            const open = Boolean(expanded[c.conference_id]);
            const tracks = c.tracks || [];

            return (
              <article
                key={c.conference_id}
                className="bg-white border-2 border-[#e5e2db] rounded-3xl p-6 sm:p-8 shadow-sm space-y-5 hover:shadow-md transition-all"
              >
                <header className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="inline-block bg-[#0f0e13] text-white text-xs font-black px-3.5 py-1.5 rounded-xl shadow-xs">
                      {c.acronym || 'CONF'}
                    </span>
                    {due && (
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-black border ${
                          closed 
                            ? 'bg-red-100 border-red-200 text-red-700' 
                            : 'bg-green-100 border-green-200 text-green-700'
                        }`}
                      >
                        {closed ? 'Deadline Passed' : 'Submission Open'}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-black text-[#0f0e13] leading-snug">{c.title}</h2>
                  <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                    {c.location ? `${c.location} • ` : ''}
                    {c.start_date ? new Date(c.start_date).toLocaleDateString(undefined, dateOnly) : ''}
                    {c.end_date ? ` – ${new Date(c.end_date).toLocaleDateString(undefined, dateOnly)}` : ''}
                  </p>
                </header>

                {due && (
                  <div className="flex items-center gap-2 text-xs font-extrabold text-gray-700 bg-[#f4f1ea] p-3 rounded-2xl border-2 border-[#e5e2db]">
                    <span className="font-black uppercase tracking-wider text-gray-500">Deadline:</span>
                    <span>{due.toLocaleString(undefined, dateTime)}</span>
                  </div>
                )}

                {tracks.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="block text-xs font-black uppercase tracking-wider text-gray-500">Tracks</span>
                    <div className="flex flex-wrap gap-2">
                      {tracks.map((t, idx) => (
                        <span
                          key={idx}
                          className="bg-[#f4f1ea] border-2 border-[#e5e2db] px-3 py-1 rounded-xl text-xs font-black text-gray-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t-2 border-[#e5e2db]/60">
                  <span className="block text-xs font-black uppercase tracking-wider text-gray-500">Call for Papers Details</span>
                  <div
                    className={`text-sm font-medium text-gray-800 whitespace-pre-wrap leading-relaxed ${
                      open || !isLong(c.content) ? '' : 'line-clamp-6'
                    }`}
                  >
                    {c.content || 'No description provided.'}
                  </div>

                  {isLong(c.content) && (
                    <button
                      type="button"
                      onClick={() => toggle(c.conference_id)}
                      className="text-xs font-black text-[#ff5c35] hover:underline cursor-pointer pt-1 inline-block"
                    >
                      {open ? 'Show less' : 'Read the full call ↓'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}