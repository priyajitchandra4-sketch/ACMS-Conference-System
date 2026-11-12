import React from 'react';

export function PageTitle({ title, subtitle, eyebrow }) {
  return <header className="mb-6"><div className="text-xs uppercase tracking-[0.16em] text-[#ff8b6e]">{eyebrow || 'ACMS'}</div><h1 className="text-2xl md:text-3xl font-bold text-white mt-1">{title}</h1>{subtitle && <p className="text-sm text-gray-400 mt-2 max-w-3xl">{subtitle}</p>}</header>;
}
export function Panel({ children, className = '' }) {
  return <section className={`bg-[#18181b] border border-white/10 rounded-2xl p-5 ${className}`}>{children}</section>;
}
export function Notice({ children, tone = 'error' }) {
  const style = tone === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-200' : tone === 'info' ? 'border-sky-500/30 bg-sky-500/10 text-sky-200' : 'border-red-500/30 bg-red-500/10 text-red-200';
  return <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${style}`}>{children}</div>;
}
export function Loading({ label = 'Loading…' }) { return <p className="p-6 text-gray-400">{label}</p>; }
export function ErrorMessage({ error, fallback = 'Something went wrong.' }) { return <Notice>{error?.response?.data?.detail || error?.message || fallback}</Notice>; }
export function ActionButton({ children, busy = false, disabled = false, type = 'button', onClick, variant = 'primary' }) {
  const style = variant === 'secondary' ? 'border border-white/15 text-gray-200 hover:bg-white/5' : variant === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-[#ff5c35] text-white hover:opacity-90';
  return <button type={type} onClick={onClick} disabled={disabled || busy} className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${style}`}>{busy ? 'Please wait…' : children}</button>;
}
export function dateTime(value) { return value ? new Date(value).toLocaleString() : '—'; }
export function StatusPill({ value }) {
  const v = String(value || 'unknown').toLowerCase();
  const style = ['paid','accepted','submitted','complete','completed','accepted'].includes(v) ? 'bg-green-500/10 text-green-300 border-green-500/30' : ['pending','draft','under_review','in_review'].includes(v) ? 'bg-yellow-500/10 text-yellow-200 border-yellow-500/30' : ['rejected','declined','failed','overdue'].includes(v) ? 'bg-red-500/10 text-red-300 border-red-500/30' : 'bg-white/5 text-gray-300 border-white/10';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs capitalize ${style}`}>{v.replaceAll('_',' ')}</span>;
}
