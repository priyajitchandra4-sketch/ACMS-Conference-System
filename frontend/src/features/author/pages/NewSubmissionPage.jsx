import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowUpRight, BookOpen, CalendarDays, Check, CheckCircle2,
  Clock3, Download, Eye, FileText, FileUp, LockKeyhole, Mail, Pencil,
  Plus, Save, Trash2, UploadCloud, UserRound, Users
} from 'lucide-react';
import { papersApi } from '../../../api/papers';
import { useAutosave } from '../../../hooks/useautoSave';

const FONT = { fontFamily: 'Arial, Helvetica, sans-serif' };

function formatTimestamp(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function FieldLabel({ htmlFor, children }) {
  return <label htmlFor={htmlFor} className="mb-2 block text-sm font-bold text-slate-700">{children}</label>;
}

function Metadata({ icon: Icon, label, value, tone = 'indigo' }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    slate: 'bg-slate-100 text-slate-700',
  };
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4">
      <span className={`rounded-xl p-2.5 ${tones[tone]}`}><Icon size={17} /></span>
      <div className="min-w-0">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-1 break-words text-sm font-bold leading-5 text-slate-800">{value}</p>
      </div>
    </div>
  );
}

export default function NewSubmissionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedMode = searchParams.get('mode') === 'edit' ? 'edit' : 'view';

  const [paper, setPaper] = useState(null);
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [authors, setAuthors] = useState([]);
  const [newAuthorName, setNewAuthorName] = useState('');
  const [newAuthorEmail, setNewAuthorEmail] = useState('');
  const [newAuthorAffiliation, setNewAuthorAffiliation] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [openingManuscript, setOpeningManuscript] = useState(false);
  const [manuscriptError, setManuscriptError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    papersApi.getById(id)
      .then((data) => {
        if (!active) return;
        setPaper(data);
        setTitle(data.title || '');
        setAbstract(data.abstract || '');
        setAuthors(Array.isArray(data.authors) ? data.authors : []);
      })
      .catch((err) => {
        if (active) setLoadError(err.response?.data?.detail || err.message || 'Failed to load paper details.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const isEditable = requestedMode === 'edit' && paper?.status === 'draft' && !permissionDenied;
  const isSubmitted = paper?.status === 'submitted';

  const saveChanges = useCallback(async (values) => {
    try {
      const updated = await papersApi.update(id, values);
      setPaper((current) => current ? { ...current, ...updated } : updated);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 409) setPermissionDenied(true);
      throw err;
    }
  }, [id]);

  const values = useMemo(() => ({ title, abstract, authors }), [title, abstract, authors]);
  const { status: saveStatus, lastSaved, error: saveError, flush } = useAutosave(
    values, saveChanges, { delay: 900, enabled: Boolean(paper && isEditable) }
  );

  useEffect(() => { if (saveError) setError(saveError); }, [saveError]);

  useEffect(() => {
    if (!isEditable && paper && (saveStatus === 'pending' || saveStatus === 'saving')) {
      flush().catch((err) => setError(err.response?.data?.detail || err.message || 'Could not save pending edits.'));
    }
  }, [isEditable, paper, saveStatus, flush]);

  const handleAddAuthor = (event) => {
    event.preventDefault();
    if (!newAuthorName.trim() || !newAuthorEmail.trim()) {
      setError('Author name and email are required.');
      return;
    }
    setError('');
    setAuthors((current) => [...current, {
      name: newAuthorName.trim(),
      email: newAuthorEmail.trim().toLowerCase(),
      affiliation: newAuthorAffiliation.trim(),
    }]);
    setNewAuthorName('');
    setNewAuthorEmail('');
    setNewAuthorAffiliation('');
  };

  const handleOpenFinalManuscript = async () => {
    if (openingManuscript) return;
    setOpeningManuscript(true);
    setManuscriptError('');
    let objectUrl;
    const previewWindow = window.open('about:blank', '_blank');
    try {
      const response = await papersApi.getFinalManuscript(id);
      const contentType = response.headers?.['content-type'] || 'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      objectUrl = URL.createObjectURL(blob);
      if (previewWindow) {
        previewWindow.location.href = objectUrl;
      } else {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = 'final-manuscript';
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (err) {
      if (previewWindow && !previewWindow.closed) previewWindow.close();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setManuscriptError(err.response?.data?.detail || 'Could not open the latest manuscript file.');
    } finally {
      setOpeningManuscript(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const updated = await papersApi.uploadManuscript(id, formData);
      setPaper((current) => current ? { ...current, ...updated } : updated);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 409) setPermissionDenied(true);
      setError(err.response?.data?.detail || err.message || 'Failed to upload manuscript.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!isEditable || submitting || uploading) return;
    if (!window.confirm('Finalize and submit this paper? Editing will be disabled after submission.')) return;
    setError('');
    setSubmitting(true);
    try {
      await flush();
      const submitted = await papersApi.submit(id);
      setPaper((current) => current ? { ...current, ...submitted } : submitted);
      navigate(`/author/papers/${id}?mode=view`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to submit paper.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={FONT} className="flex min-h-[420px] items-center justify-center">
      <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-white px-6 py-5 shadow-sm">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        <p className="text-sm font-bold text-slate-600">Loading submission…</p>
      </div>
    </div>;
  }

  if (loadError || !paper) {
    return <div style={FONT} className="flex min-h-[420px] items-center justify-center">
      <div className="w-full max-w-xl space-y-5 rounded-[28px] border border-rose-200 bg-white p-8 shadow-sm">
        <p role="alert" className="text-sm font-bold text-rose-700">{loadError || 'The requested paper could not be loaded.'}</p>
        <button type="button" onClick={() => navigate('/author/papers')} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700">Back to My Submissions</button>
      </div>
    </div>;
  }

  const saveLabel = !isEditable ? 'Read-only'
    : saveStatus === 'saving' ? 'Saving changes…'
    : saveStatus === 'pending' ? 'Unsaved changes'
    : saveStatus === 'error' ? 'Save failed'
    : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}`
    : 'All changes saved';

  const statusColor = isSubmitted
    ? 'bg-emerald-100 text-emerald-800'
    : 'bg-amber-100 text-amber-800';

  return (
    <div style={FONT} className="space-y-7 text-slate-900">
      <header className="overflow-hidden rounded-[28px] border border-indigo-100 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 px-6 py-7 text-white sm:px-8">
          <button type="button" onClick={() => navigate('/author/papers')} className="mb-5 inline-flex items-center gap-2 rounded-lg text-sm font-bold text-indigo-100 transition hover:text-white">
            <ArrowLeft size={17} /> Back to submissions
          </button>
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 font-mono text-xs font-bold text-white/90">{paper.paper_number || `PAPER-${paper.id}`}</span>
                <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold capitalize ${isSubmitted ? 'bg-emerald-300 text-emerald-950' : 'bg-amber-200 text-amber-950'}`}>{paper.status}</span>
                {isEditable && <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white">Editing enabled</span>}
              </div>
              <h1 className="mt-4 max-w-3xl break-words text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{isEditable ? 'Edit submission' : 'Submission details'}</h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-indigo-100">
                {isEditable ? 'Update your paper details and replace the manuscript before final submission.' : 'Review the submission details and access its latest manuscript.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isEditable && <button type="button" onClick={handleSubmit} disabled={submitting || uploading || saveStatus === 'saving' || saveStatus === 'pending'}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-indigo-700 shadow-lg transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50">
                <CheckCircle2 size={17} /> {submitting ? 'Submitting…' : 'Finalize & submit'}
              </button>}
              {isEditable && <button type="button" onClick={() => navigate(`/author/papers/${id}?mode=view`)} className="rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/20">View mode</button>}
              {!isEditable && paper.status === 'draft' && <button type="button" onClick={() => navigate(`/author/papers/${id}?mode=edit`)} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-indigo-700 shadow-lg hover:bg-indigo-50"><Pencil size={16} /> Edit draft</button>}
            </div>
          </div>
        </div>
        <div className="grid gap-3 bg-indigo-50/60 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
          <Metadata icon={CalendarDays} label="Created" value={formatTimestamp(paper.created_at)} />
          <Metadata icon={Clock3} label="Last updated" value={formatTimestamp(paper.updated_at || paper.created_at)} />
          <Metadata icon={CheckCircle2} label="Submitted" value={formatTimestamp(paper.submitted_at)} tone={paper.submitted_at ? 'emerald' : 'slate'} />
          <Metadata icon={LockKeyhole} label="Editing status" value={isEditable ? 'Author editing enabled' : 'Read-only'} tone={isEditable ? 'indigo' : 'slate'} />
        </div>
      </header>

      {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">{error}</div>}
      {!isEditable && <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm font-semibold leading-6 text-sky-900">
        <Eye size={19} className="mt-0.5 shrink-0 text-sky-600" />
        <span>{isSubmitted ? 'This submission is finalized. Its details and final manuscript are available in read-only mode.' : 'You are viewing this draft in read-only mode. Use Edit draft to make changes while it remains a draft.'}</span>
      </div>}
      {requestedMode === 'edit' && paper.status !== 'draft' && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">This paper has already been submitted, so editing is no longer permitted.</div>}
      {permissionDenied && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">Your account does not have permission to edit this paper. It is now displayed read-only.</div>}

      <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="rounded-2xl bg-indigo-50 p-3 text-indigo-600"><BookOpen size={21} /></span>
          <div><h2 className="text-lg font-extrabold text-slate-900">Paper information</h2><p className="mt-0.5 text-sm font-medium text-slate-500">Title and abstract details</p></div>
        </div>
        <div className="space-y-5">
          <div>
            <FieldLabel htmlFor="paper-title">Paper title</FieldLabel>
            <input id="paper-title" type="text" value={title} onChange={(event) => setTitle(event.target.value)} disabled={!isEditable}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 text-base font-bold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-600" placeholder="Enter your research paper title…" />
          </div>
          <div>
            <FieldLabel htmlFor="paper-abstract">Abstract</FieldLabel>
            <textarea id="paper-abstract" rows={7} value={abstract} onChange={(event) => setAbstract(event.target.value)} disabled={!isEditable}
              className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 text-sm font-medium leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-600" placeholder="Write a clear summary of your research…" />
          </div>
        </div>
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="rounded-2xl bg-violet-50 p-3 text-violet-600"><Users size={21} /></span>
          <div><h2 className="text-lg font-extrabold text-slate-900">Authors and affiliations</h2><p className="mt-0.5 text-sm font-medium text-slate-500">People contributing to this research</p></div>
        </div>
        {authors.length ? <div className="grid gap-3 sm:grid-cols-2">
          {authors.map((author, index) => <div key={`${author.email || author.name || 'author'}-${index}`} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <span className="rounded-xl bg-white p-2.5 text-indigo-600 shadow-sm"><UserRound size={18} /></span>
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-extrabold text-slate-900">{author.name}</p>
              {author.email && <p className="mt-1 flex items-center gap-1.5 break-all text-xs font-medium text-slate-500"><Mail size={13} />{author.email}</p>}
              <p className="mt-1 text-xs font-semibold text-slate-500">{author.affiliation || 'No affiliation specified'}</p>
            </div>
            {isEditable && <button type="button" onClick={() => setAuthors((current) => current.filter((_, authorIndex) => authorIndex !== index))} aria-label={`Remove ${author.name}`} className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-100"><Trash2 size={16} /></button>}
          </div>)}
        </div> : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-medium text-slate-500">No authors have been added to this submission.</div>}

        {isEditable && <form onSubmit={handleAddAuthor} className="mt-6 border-t border-slate-100 pt-6">
          <h3 className="mb-4 text-sm font-extrabold text-slate-800">Add a co-author</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div><FieldLabel htmlFor="author-name">Full name</FieldLabel><input id="author-name" value={newAuthorName} onChange={(event) => setNewAuthorName(event.target.value)} required placeholder="Author name" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" /></div>
            <div><FieldLabel htmlFor="author-email">Email address</FieldLabel><input id="author-email" type="email" value={newAuthorEmail} onChange={(event) => setNewAuthorEmail(event.target.value)} required placeholder="name@university.edu" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" /></div>
            <div><FieldLabel htmlFor="author-affiliation">Affiliation</FieldLabel><input id="author-affiliation" value={newAuthorAffiliation} onChange={(event) => setNewAuthorAffiliation(event.target.value)} placeholder="University / Institution" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" /></div>
          </div>
          <button type="submit" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700"><Plus size={17} /> Add author</button>
        </form>}
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex items-center gap-3">
          <span className="rounded-2xl bg-emerald-50 p-3 text-emerald-600"><FileText size={21} /></span>
          <div><h2 className="text-lg font-extrabold text-slate-900">Final manuscript</h2><p className="mt-0.5 text-sm font-medium text-slate-500">Only the latest uploaded manuscript is exposed here</p></div>
        </div>
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-white p-2.5 text-emerald-600 shadow-sm"><FileText size={20} /></span>
            <div><p className="text-sm font-extrabold text-slate-900">{paper.status === 'submitted' ? 'Submitted manuscript' : 'Latest uploaded manuscript'}</p><p className="mt-1 text-xs font-medium leading-5 text-slate-600">PDF files can usually open in the browser. DOC and DOCX files may download instead.</p></div>
          </div>
          <button type="button" onClick={handleOpenFinalManuscript} disabled={openingManuscript}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-5 py-3 text-sm font-extrabold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-50">
            {openingManuscript ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" /> Opening…</> : <><Eye size={17} /> View latest file <ArrowUpRight size={15} /></>}
          </button>
        </div>
        {manuscriptError && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{manuscriptError}</p>}
        {isEditable && <div className="mt-5 border-t border-slate-100 pt-5">
          <label htmlFor="manuscript-upload" className="mb-3 block text-sm font-extrabold text-slate-800">Replace manuscript</label>
          <label htmlFor="manuscript-upload" className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 px-5 py-8 text-center transition hover:border-indigo-400 hover:bg-indigo-50 ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
            <span className="rounded-2xl bg-white p-3 text-indigo-600 shadow-sm"><UploadCloud size={25} /></span>
            <span className="mt-3 text-sm font-extrabold text-slate-800">{uploading ? 'Uploading manuscript…' : 'Choose a replacement file'}</span>
            <span className="mt-1 text-xs font-medium text-slate-500">PDF, DOC or DOCX · Uploading creates a new version</span>
            <input id="manuscript-upload" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFileUpload} disabled={uploading} className="sr-only" />
          </label>
        </div>}
      </section>

      <footer className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500" aria-live="polite">
          {isEditable ? saveStatus === 'error' ? <span className="text-rose-600">Save failed: {saveLabel}</span>
            : saveStatus === 'saving' || saveStatus === 'pending' ? <><span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />{saveLabel}</>
            : <><Check size={15} className="text-emerald-600" />{saveLabel}</>
            : <><LockKeyhole size={15} />Read-only view</>}
        </div>
        {isEditable && <p className="text-xs font-medium text-slate-400">Changes are saved automatically.</p>}
      </footer>
    </div>
  );
}
