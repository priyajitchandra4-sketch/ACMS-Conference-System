import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { invitationsApi } from '../../../api/invitations';
import { apiError } from '../../../utils/apiError';
import { parseUtc } from '../../../utils/dates';

const inputCls =
  'w-full px-4 py-3 bg-white border-2 border-[#e5e2db] rounded-2xl text-sm font-extrabold focus:outline-none focus:ring-2 focus:ring-[#ff5c35]';
const labelCls = 'block text-xs font-black uppercase tracking-wider text-gray-700';

function Shell({ children }) {
  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-white text-[#0f0e13]">
      <div className="max-w-md w-full bg-[#f4f1ea] border-2 border-[#e5e2db] rounded-3xl p-8 sm:p-10 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-block bg-white text-[#0f0e13] font-black text-xs uppercase tracking-widest px-4 py-2 rounded-full border-2 border-[#e5e2db] shadow-sm">
            ACMS Portal
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [invite, setInvite] = useState(null); // details loaded from the backend
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState(''); // invalid / expired / already used
  const [done, setDone] = useState(null); // { kind: 'accepted' | 'declined', accountCreated }
  const [formData, setFormData] = useState({ fullName: '', affiliation: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    invitationsApi
      .getByToken(token)
      .then((data) => {
        setInvite(data);
        setProblem('');
      })
      .catch((err) => setProblem(apiError(err, 'This invitation link is not valid.')))
      .finally(() => setLoading(false));
  }, [token]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleAccept = async (e) => {
    e.preventDefault();
    setError('');

    // Someone with an account only confirms. A new person must also create an account.
    let payload = {};
    if (!invite.account_exists) {
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      payload = {
        full_name: formData.fullName.trim(),
        affiliation: formData.affiliation.trim() || null,
        password: formData.password,
      };
    }

    try {
      setBusy(true);
      const res = await invitationsApi.accept(token, payload);
      setDone({ kind: 'accepted', accountCreated: res.account_created });
    } catch (err) {
      setError(apiError(err, 'Failed to accept the invitation.'));
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    if (!window.confirm('Decline this invitation?')) return;
    setError('');
    try {
      setBusy(true);
      await invitationsApi.decline(token);
      setDone({ kind: 'declined' });
    } catch (err) {
      setError(apiError(err, 'Failed to decline the invitation.'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <p className="text-center text-sm font-extrabold text-gray-600">Checking your invitation...</p>
      </Shell>
    );
  }

  if (problem) {
    return (
      <Shell>
        <h1 className="text-2xl font-black text-center">Invitation unavailable</h1>
        <div className="p-4 bg-red-100 border-2 border-red-300 text-red-700 text-sm font-bold rounded-2xl text-center">
          {problem}
        </div>
        <p className="text-center text-xs font-extrabold text-gray-600">
          Ask the person who invited you to send a new one.
        </p>
        <div className="text-center">
          <Link to="/login" className="text-[#ff5c35] font-black text-sm hover:underline">
            Go to sign in
          </Link>
        </div>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <h1 className="text-2xl font-black text-center">
          {done.kind === 'accepted' ? 'Invitation accepted' : 'Invitation declined'}
        </h1>
        <p className="text-center text-sm font-extrabold text-gray-600">
          {done.kind === 'accepted'
            ? done.accountCreated
              ? 'Your account is ready. Sign in with your email and the password you just chose.'
              : `The ${invite.role_label} role has been added to your account. Sign in to continue.`
            : 'The person who invited you has been told.'}
        </p>
        <button
          type="button"
          onClick={() => navigate(done.kind === 'accepted' ? '/login' : '/')}
          className="w-full bg-[#0f0e13] hover:bg-gray-800 text-white font-black py-4 rounded-2xl shadow-xl text-base cursor-pointer"
        >
          {done.kind === 'accepted' ? 'Go to sign in' : 'Back to home'}
        </button>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-3xl font-black text-center">Accept your invitation</h1>

      <div className="bg-[#0f0e13] text-white p-4 rounded-2xl shadow-inner space-y-1">
        <div className="text-sm font-black">Invited as {invite.role_label}</div>
        {invite.conference_title && (
          <div className="text-xs font-extrabold text-gray-300">
            {invite.conference_acronym ? `${invite.conference_acronym} - ` : ''}
            {invite.conference_title}
          </div>
        )}
        {invite.track_name && (
          <div className="text-xs font-extrabold text-orange-400">Track: {invite.track_name}</div>
        )}
        <div className="text-xs font-extrabold text-gray-400">
          Valid until {parseUtc(invite.expires_at).toLocaleDateString()}
        </div>
      </div>

      <form onSubmit={handleAccept} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-100 border border-red-300 text-red-700 text-xs font-bold rounded-xl">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className={labelCls}>Email</label>
          <input
            type="email"
            disabled
            value={invite.email}
            className="w-full px-4 py-3 bg-gray-200 border-2 border-[#e5e2db] rounded-2xl text-sm font-extrabold text-gray-600 cursor-not-allowed"
          />
        </div>

        {invite.account_exists ? (
          <p className="text-sm font-extrabold text-gray-700 bg-white border-2 border-[#e5e2db] rounded-2xl p-4">
            You already have an account with this email. Accepting adds the {invite.role_label} role to it.
            Your password stays the same.
          </p>
        ) : (
          <>
            <div className="space-y-1">
              <label className={labelCls}>Full name</label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Dr. Rahul Das"
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Affiliation</label>
              <input
                type="text"
                name="affiliation"
                value={formData.affiliation}
                onChange={handleChange}
                placeholder="University or organization"
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Create a password</label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                className={inputCls}
              />
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-[#0f0e13] hover:bg-gray-800 text-white font-black py-4 rounded-2xl shadow-xl transition-all text-base mt-2 cursor-pointer disabled:opacity-50"
        >
          {busy ? 'Please wait...' : invite.account_exists ? 'Accept invitation' : 'Accept and create account'}
        </button>
      </form>

      <div className="text-center text-xs font-extrabold text-gray-600 pt-2 border-t-2 border-[#e5e2db]/60 space-y-2">
        <button
          type="button"
          onClick={handleDecline}
          disabled={busy}
          className="text-red-700 font-black hover:underline cursor-pointer disabled:opacity-50"
        >
          Decline invitation
        </button>
        <div>
          Already have an account?{' '}
          <Link to="/login" className="text-[#ff5c35] font-black hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </Shell>
  );
}