import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users, Trash2, ArrowLeft, Layers3, AlertCircle, UserCheck
} from 'lucide-react';
import { conferencesApi } from '../../../api/conferences';
import { committeeApi } from '../../../api/committee';
import { invitationsApi } from '../../../api/invitations';
import { apiError } from '../../../utils/apiError';
import { roleLabel } from '../../../utils/roles';
import InviteForm from '../../../components/InviteForm';
import InvitationsTable from '../../../components/InvitationsTable';

const FONT = { fontFamily: 'Arial, Helvetica, sans-serif' };
const ALL_ROLES = ['track_chair', 'meta_reviewer', 'reviewer'];

export default function ProgramCommitteePage() {
  const { conferenceId } = useParams();
  const navigate = useNavigate();
  const validId = /^\d+$/.test(conferenceId || '');

  const [tracks, setTracks] = useState([]);
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [t, m, i] = await Promise.all([
        conferencesApi.listTracks(conferenceId),
        committeeApi.list(conferenceId),
        invitationsApi.list({ conference_id: conferenceId }),
      ]);
      setTracks(t || []);
      setMembers(m || []);
      setInvitations(i || []);
      setError('');
    } catch (err) {
      setError(apiError(err, 'Could not load the program committee.'));
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    if (validId) {
      setLoading(true);
      load();
    } else {
      setLoading(false);
    }
  }, [validId, load]);

  const handleRemove = async (member) => {
    if (!window.confirm(`Remove ${member.full_name || member.email} as ${roleLabel(member.role)}?`)) return;
    try {
      await committeeApi.remove(conferenceId, member.assignment_id);
      load();
    } catch (err) {
      setError(apiError(err, 'Could not remove this member.'));
    }
  };

  if (!validId) {
    return (
      <div style={FONT} className="flex min-h-[420px] items-center justify-center">
        <div className="w-full max-w-lg rounded-[28px] border-2 border-dashed border-indigo-200 bg-white px-6 py-14 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <AlertCircle size={28} />
          </span>
          <h2 className="mt-5 text-xl font-extrabold text-slate-900">Program committee</h2>
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
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Program committee</h1>
          <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-indigo-100 sm:text-base">
            Invite Track Chairs, Meta-Reviewers and Reviewers, and see who has accepted.
          </p>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <InviteForm tracks={tracks} allowedRoles={ALL_ROLES} onInvited={load} />

      <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
            <Users size={21} />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Members</h2>
            <p className="mt-0.5 text-sm font-medium text-slate-500">Active committee roles across tracks</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-slate-50 px-5 py-4">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              <p className="text-sm font-bold text-slate-600">Loading members…</p>
            </div>
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-slate-50/70 p-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <UserCheck size={24} />
            </span>
            <p className="mt-3 text-sm font-bold text-slate-600">
              No members yet. People appear here after they accept an invitation.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {['Name', 'Email', 'Role', 'Track', ''].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {members.map((m) => (
                  <tr key={m.assignment_id} className="transition hover:bg-slate-50/80">
                    <td className="px-5 py-4 text-sm font-extrabold text-slate-900">
                      {m.full_name || '-'}
                      {m.affiliation && (
                        <span className="mt-0.5 block text-xs font-semibold text-slate-500">{m.affiliation}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-600">{m.email}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                        {roleLabel(m.role)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-600">{m.track_name || '-'}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemove(m)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-extrabold text-rose-700 transition hover:bg-rose-100 cursor-pointer"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <InvitationsTable
        invitations={invitations}
        loading={loading}
        manageableRoles={ALL_ROLES}
        onChanged={load}
      />
    </div>
  );
}