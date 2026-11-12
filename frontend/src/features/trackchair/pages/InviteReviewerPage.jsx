import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { rolesApi } from '../../../api/roles';
import { invitationsApi } from '../../../api/invitations';
import { apiError } from '../../../utils/apiError';
import InviteForm from '../../../components/InviteForm';
import InvitationsTable from '../../../components/InvitationsTable';

const TRACK_CHAIR_ROLES = ['reviewer', 'meta_reviewer'];

export default function InviteReviewersPage() {
  const [myTracks, setMyTracks] = useState([]); // tracks this person chairs
  const [selected, setSelected] = useState('');
  const [invitations, setInvitations] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    rolesApi
      .mine()
      .then((roles) => {
        const tracks = roles
          .filter((r) => r.role === 'track_chair' && r.track_id)
          .map((r) => ({ id: r.track_id, name: r.track_name || `Track ${r.track_id}` }));
        setMyTracks(tracks);
        if (tracks.length) setSelected(String(tracks[0].id));
      })
      .catch((err) => setError(apiError(err, 'Could not load your roles.')))
      .finally(() => setLoadingRoles(false));
  }, []);

  const loadInvitations = useCallback(async () => {
    if (!selected) return;
    setLoadingInvites(true);
    try {
      setInvitations(await invitationsApi.list({ track_id: selected }));
      setError('');
    } catch (err) {
      setError(apiError(err, 'Could not load invitations.'));
    } finally {
      setLoadingInvites(false);
    }
  }, [selected]);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  const selectedTrack = useMemo(() => myTracks.filter((t) => String(t.id) === selected), [myTracks, selected]);

  if (loadingRoles) {
    return <p className="text-sm font-extrabold text-gray-500">Loading...</p>;
  }

  if (myTracks.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-2xl font-black text-[#0f0e13]">Invite reviewers</h2>
        {error && (
          <div className="p-4 bg-red-100 border-2 border-red-300 text-red-700 text-xs font-bold rounded-2xl">
            {error}
          </div>
        )}
        <p className="text-sm font-extrabold text-gray-600">
          You are not a Track Chair of any track yet. The Chair has to invite you first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b-2 border-[#e5e2db] pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-[#0f0e13]">Invite reviewers</h2>
          <p className="text-sm font-extrabold text-gray-600 mt-1">
            Invite Reviewers and Meta-Reviewers into your track and follow their answers
          </p>
        </div>
        {myTracks.length > 1 && (
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="px-4 py-2 bg-white border-2 border-[#e5e2db] rounded-2xl text-sm font-extrabold"
          >
            {myTracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-100 border-2 border-red-300 text-red-700 text-xs font-bold rounded-2xl">
          {error}
        </div>
      )}

      <InviteForm tracks={selectedTrack} allowedRoles={TRACK_CHAIR_ROLES} onInvited={loadInvitations} />

      <InvitationsTable
        invitations={invitations}
        loading={loadingInvites}
        manageableRoles={TRACK_CHAIR_ROLES}
        onChanged={loadInvitations}
      />
    </div>
  );
}