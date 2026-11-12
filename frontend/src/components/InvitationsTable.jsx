import React, { useState } from 'react';
import { invitationsApi } from '../api/invitations';
import { apiError } from '../utils/apiError';
import { parseUtc } from '../utils/dates';
import { roleLabel } from '../utils/roles';

const STATUS_STYLES = {
  pending: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  revoked: 'bg-gray-200 text-gray-600',
  expired: 'bg-yellow-100 text-yellow-700',
};

/**
 * Props
 *  invitations:     list from invitationsApi.list(...)
 *  loading:         boolean
 *  manageableRoles: roles this person may cancel or re-send (Chair: all, Track Chair: reviewer + meta_reviewer)
 *  onChanged:       called after cancel / resend so the parent can reload
 */
export default function InvitationsTable({ invitations, loading, manageableRoles, onChanged }) {
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const run = async (id, action, doneText) => {
    setError('');
    setNotice('');
    setBusyId(id);
    try {
      await action(id);
      setNotice(doneText);
      if (onChanged) onChanged();
    } catch (err) {
      setError(apiError(err, 'That did not work.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleRevoke = (inv) => {
    if (window.confirm(`Cancel the invitation for ${inv.email}?`)) {
      run(inv.id, invitationsApi.revoke, 'Invitation cancelled.');
    }
  };

  return (
    <div className="bg-white border-2 border-[#e5e2db] rounded-3xl p-6 shadow-sm space-y-4">
      <h3 className="text-base font-black text-[#0f0e13]">Invitations</h3>

      {error && (
        <div className="p-3 bg-red-100 border-2 border-red-300 text-red-700 text-xs font-bold rounded-2xl">
          {error}
        </div>
      )}
      {notice && (
        <div className="p-3 bg-green-100 border-2 border-green-300 text-green-700 text-xs font-bold rounded-2xl">
          {notice}
        </div>
      )}

      {loading ? (
        <p className="text-sm font-extrabold text-gray-500 p-2">Loading invitations...</p>
      ) : invitations.length === 0 ? (
        <div className="p-8 text-center bg-[#f4f1ea] border-2 border-dashed border-[#e5e2db] rounded-2xl">
          <p className="text-sm font-extrabold text-gray-600">No invitations sent yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y-2 divide-[#e5e2db]">
            <thead>
              <tr>
                {['Email', 'Role', 'Track', 'Status', 'Expires', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-black text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e2db]">
              {invitations.map((inv) => {
                const canManage = manageableRoles.includes(inv.role);
                const canAct = canManage && (inv.status === 'pending' || inv.status === 'expired');
                return (
                  <tr key={inv.id}>
                    <td className="px-4 py-3 text-sm font-black text-[#0f0e13]">{inv.email}</td>
                    <td className="px-4 py-3 text-sm font-extrabold text-gray-700">{roleLabel(inv.role)}</td>
                    <td className="px-4 py-3 text-sm font-extrabold text-gray-600">{inv.track_name || '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-3 py-1 rounded-xl text-xs font-black capitalize ${
                          STATUS_STYLES[inv.status] || 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-extrabold text-gray-600">
                      {parseUtc(inv.expires_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                      {canAct && (
                        <>
                          <button
                            type="button"
                            disabled={busyId === inv.id}
                            onClick={() => run(inv.id, invitationsApi.resend, 'Invitation re-sent.')}
                            className="px-3 py-1.5 bg-[#f4f1ea] border-2 border-[#e5e2db] text-xs font-black rounded-xl hover:bg-gray-200 cursor-pointer disabled:opacity-50"
                          >
                            Resend
                          </button>
                          {inv.status === 'pending' && (
                            <button
                              type="button"
                              disabled={busyId === inv.id}
                              onClick={() => handleRevoke(inv)}
                              className="px-3 py-1.5 bg-red-100 border-2 border-red-200 text-red-700 text-xs font-black rounded-xl hover:bg-red-200 cursor-pointer disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}