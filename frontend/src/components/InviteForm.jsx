import React, { useState, useEffect } from 'react';
import { invitationsApi } from '../api/invitations';
import { apiError } from '../utils/apiError';
import { roleLabel } from '../utils/roles';

const inputCls =
  'w-full px-4 py-3 bg-white border-2 border-[#e5e2db] rounded-2xl text-sm font-extrabold text-[#0f0e13] focus:outline-none focus:ring-2 focus:ring-[#ff5c35]';
const labelCls = 'block text-xs font-black uppercase tracking-wider text-gray-700';

/**
 * Props
 *  tracks:       [{ id, name }]  the tracks the person may invite into
 *  allowedRoles: ['reviewer', 'meta_reviewer', 'track_chair']
 *  onInvited:    called after an invitation was created (reload your lists)
 */
export default function InviteForm({ tracks, allowedRoles, onInvited }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(allowedRoles[0]);
  const [trackId, setTrackId] = useState(tracks[0]?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Keep the selected track valid when the list of tracks changes
  useEffect(() => {
    if (!tracks.some((t) => String(t.id) === String(trackId))) {
      setTrackId(tracks[0]?.id ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!trackId) {
      setError('Choose a track first.');
      return;
    }
    setSaving(true);
    try {
      await invitationsApi.create({ email: email.trim(), role, track_id: Number(trackId) });
      setSuccess(`Invitation sent to ${email.trim()}.`);
      setEmail('');
      if (onInvited) onInvited();
    } catch (err) {
      setError(apiError(err, 'Could not send the invitation.'));
    } finally {
      setSaving(false);
    }
  };

  if (tracks.length === 0) {
    return (
      <div className="p-6 bg-[#f4f1ea] border-2 border-dashed border-[#e5e2db] rounded-3xl">
        <p className="text-sm font-extrabold text-gray-600">
          There are no tracks yet. Create a track first, then you can invite people into it.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#f4f1ea] border-2 border-[#e5e2db] rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm"
    >
      <h3 className="text-base font-black text-[#0f0e13]">Invite someone</h3>

      {error && (
        <div className="p-3 bg-red-100 border-2 border-red-300 text-red-700 text-xs font-bold rounded-2xl">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-100 border-2 border-green-300 text-green-700 text-xs font-bold rounded-2xl">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className={labelCls}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@university.edu"
            className={inputCls}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
            {allowedRoles.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Track</label>
          <select value={trackId} onChange={(e) => setTrackId(e.target.value)} className={inputCls}>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="bg-[#0f0e13] hover:bg-gray-800 text-white font-black px-6 py-3.5 rounded-2xl shadow-md transition-all text-sm cursor-pointer disabled:opacity-50"
        >
          {saving ? 'Sending...' : 'Send invitation'}
        </button>
      </div>
    </form>
  );
}