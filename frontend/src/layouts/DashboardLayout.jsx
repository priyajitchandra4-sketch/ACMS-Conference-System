import React, { useEffect, useState, useCallback } from 'react';
import {
  Outlet,
  useNavigate,
  useLocation,
  useMatch,
} from 'react-router-dom';
import {
  LayoutDashboard,
  PanelsTopLeft,
  CalendarDays,
  ListChecks,
  FileText,
  Users,
  Bell,
  LogOut,
  Menu,
  X,
  Settings,
  UserRound,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

import { useAuth } from '../auth/AuthContext';
import { rolesApi } from '../api/roles';
import { notificationsApi } from '../api/notifications';
import { roleLabel } from '../utils/roles';

const iconByLabel = {
  'All conferences': PanelsTopLeft,
  'Conference settings': Settings,
  Deadlines: CalendarDays,
  Tracks: ListChecks,
  'Call for papers': FileText,
  'Program committee': Users,
  'Invite reviewers': ShieldCheck,
  'My Submissions': FileText,
  'My decisions': FileText,
  'Reviewer expertise': UserRound,
  Bidding: ListChecks,
  'My assignments': ListChecks,
  'Papers assigned to me': FileText,
  'Decision queue': ShieldCheck,
  'Assignments manager': PanelsTopLeft,
  'Review progress': CalendarDays,
  'External reviewers': Users,
  'External assignments': FileText,
  'Delegate registration': UserRound,
  'Delegate payment': ShieldCheck,
  'Delegates & payments': Users,
  Reports: PanelsTopLeft,
  'Audit log': FileText,
  Security: ShieldCheck,
  Notifications: Bell,
};

function prettifySegment(segment) {
  if (!segment) return 'Overview';
  return decodeURIComponent(segment)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [roles, setRoles] = useState([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [unread, setUnread] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const match = useMatch('/chair/conferences/:conferenceId/*');
  const urlId = match?.params.conferenceId;
  const validUrlId = urlId && /^\d+$/.test(urlId) ? urlId : null;

  useEffect(() => {
    if (validUrlId) localStorage.setItem('activeConferenceId', validUrlId);
  }, [validUrlId]);

  const savedId = localStorage.getItem('activeConferenceId');
  const conferenceId =
    validUrlId || (savedId && /^\d+$/.test(savedId) ? savedId : null);

  useEffect(() => {
    let active = true;

    rolesApi
      .mine()
      .then((data) => {
        if (active) setRoles(data);
      })
      .catch(() => {
        if (active) setRoles([]);
      })
      .finally(() => {
        if (active) setRolesLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const loadUnread = useCallback(() => {
    notificationsApi
      .unreadCount()
      .then((data) => setUnread(data.count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadUnread();
  }, [location.pathname, loadUnread]);

  useEffect(() => {
    window.addEventListener('notifications:changed', loadUnread);
    return () => window.removeEventListener('notifications:changed', loadUnread);
  }, [loadUnread]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const handleSignOut = () => {
    localStorage.removeItem('activeConferenceId');
    logout();
    navigate('/login');
  };

  const isChair = roles.some((role) => role.role === 'chair');
  const isTrackChair = roles.some((role) => role.role === 'track_chair');
  const isMetaReviewer = roles.some((role) => role.role === 'meta_reviewer');
  const isReviewer = roles.some((role) => role.role === 'reviewer');
  const isExternalReviewer = roles.some((role) => role.role === 'external_reviewer');
  const isDelegate = roles.some((role) => role.role === 'delegate');
  const isAuthor = roles.some((role) => role.role === 'author');
  const roleNames = [...new Set(roles.map((role) => roleLabel(role.role)))];

  const chairItems = [
    { label: 'All conferences', path: '/chair/conferences', exact: true },
    ...(conferenceId
      ? [
          {
            label: 'Conference settings',
            path: `/chair/conferences/${conferenceId}/settings`,
          },
          {
            label: 'Deadlines',
            path: `/chair/conferences/${conferenceId}/deadlines`,
          },
          {
            label: 'Tracks',
            path: `/chair/conferences/${conferenceId}/tracks`,
          },
          {
            label: 'Call for papers',
            path: `/chair/conferences/${conferenceId}/cfp`,
          },
          {
            label: 'Program committee',
            path: `/chair/conferences/${conferenceId}/committee`,
          },
        ]
      : []),
    { label: 'Decision queue', path: '/chair/decisions' },
    { label: 'Delegates & payments', path: '/chair/delegates' },
    { label: 'Reports', path: '/chair/reports' },
    { label: 'Audit log', path: '/chair/audit-log' },
    { label: 'Security', path: '/chair/security' },
  ];

  const trackChairItems = [
    { label: 'Invite reviewers', path: '/trackchair/invitations' },
    { label: 'Assignments manager', path: '/trackchair/assignments' },
    { label: 'Review progress', path: '/trackchair/review-progress' },
    { label: 'External reviewers', path: '/trackchair/external-reviewers' },
  ];
  const metaReviewerItems = [
    { label: 'Papers assigned to me', path: '/meta/papers' },
    { label: 'Decision queue', path: '/meta/decisions' },
  ];
  const reviewerItems = [
    { label: 'Reviewer expertise', path: '/reviewer/expertise' },
    { label: 'Bidding', path: '/reviewer/bidding' },
    { label: 'My assignments', path: '/reviewer/assignments' },
  ];
  const externalReviewerItems = [
    { label: 'External assignments', path: '/external/assignments' },
  ];
  const delegateItems = [
    { label: 'Delegate registration', path: '/delegate/registration' },
    { label: 'Delegate payment', path: '/delegate/payment' },
  ];
  const authorItems = [
    { label: 'My Submissions', path: '/author/papers' },
    { label: 'My decisions', path: '/author/decisions' },
  ];
  const sharedItems = [
    { label: 'Notifications', path: '/notifications', badge: unread },
  ];

  const groups = [
    ...(isChair ? [{ title: 'Conference management', items: chairItems }] : []),
    ...(isTrackChair
      ? [{ title: 'Review management', items: trackChairItems }]
      : []),
    ...(isMetaReviewer
      ? [{ title: 'Meta-review workspace', items: metaReviewerItems }]
      : []),
    ...(isReviewer
      ? [{ title: 'Reviewer workspace', items: reviewerItems }]
      : []),
    ...(isExternalReviewer
      ? [{ title: 'External review', items: externalReviewerItems }]
      : []),
    ...(isDelegate
      ? [{ title: 'Delegate services', items: delegateItems }]
      : []),
    ...(isAuthor ? [{ title: 'Author workspace', items: authorItems }] : []),
    { title: 'Your account', items: sharedItems },
  ];

  const isActive = (item) =>
    item.exact
      ? location.pathname === item.path
      : location.pathname === item.path ||
        location.pathname.startsWith(`${item.path}/`);

  const currentSegment = location.pathname.split('/').filter(Boolean).pop();
  const pageTitle = prettifySegment(currentSegment);
  const initials = (user?.full_name || user?.email || 'U')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-6 pb-8 pt-7">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-xl font-black text-white shadow-lg shadow-indigo-200">
          A
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold tracking-tight text-slate-950">
            ACMS Portal
          </p>
          <p className="text-xs font-semibold tracking-wide text-slate-500">
            Conference workspace
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMobileNavOpen(false)}
          className="ml-auto rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Close navigation"
        >
          <X size={20} />
        </button>
      </div>

      <div className="mx-4 mb-7 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-extrabold text-indigo-700 shadow-sm">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">
              {user?.full_name || 'Signed in'}
            </p>
            <p className="truncate text-xs font-medium text-slate-500">
              {user?.email || 'Account'}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-indigo-100 pt-3 text-xs font-bold text-indigo-700">
          <ShieldCheck size={14} />
          {rolesLoaded ? roleNames.join(' · ') || 'No role assigned' : 'Loading role…'}
        </div>
      </div>

      <nav className="flex-1 space-y-7 overflow-y-auto px-4 pb-5">
        {groups.map((group) => (
          <section key={group.title}>
            <p className="mb-3 px-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
              {group.title}
            </p>
            <div className="space-y-1.5">
              {group.items.map((item) => {
                const Icon = iconByLabel[item.label] || LayoutDashboard;
                const active = isActive(item);

                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigate(item.path)}
                    aria-current={active ? 'page' : undefined}
                    className={`group flex w-full items-center gap-3 rounded-2xl px-3.5 py-3.5 text-left text-sm font-bold transition-all duration-200 ${
                      active
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                        : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        active
                          ? 'bg-white/15 text-white'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-indigo-600'
                      }`}
                    >
                      <Icon size={18} strokeWidth={2.2} />
                    </span>
                    <span className="min-w-0 flex-1">{item.label}</span>
                    {item.badge > 0 && (
                      <span
                        className={`min-w-6 rounded-full px-2 py-1 text-center text-xs font-extrabold ${
                          active
                            ? 'bg-white text-indigo-700'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                    {active && <ChevronRight size={17} />}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-4">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3.5 text-sm font-extrabold text-rose-600 transition hover:border-rose-200 hover:bg-rose-100"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f6ff] font-sans text-slate-900 antialiased">
      <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-indigo-100/80 bg-white/90 px-4 shadow-sm shadow-indigo-100/40 backdrop-blur-xl sm:px-7 lg:px-9">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="rounded-xl border border-slate-200 p-2.5 text-slate-700 hover:bg-slate-50 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={21} />
          </button>
          <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 sm:flex">
            <LayoutDashboard size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span>Workspace</span>
              <ChevronRight size={13} />
              <span className="truncate capitalize text-indigo-600">{pageTitle}</span>
            </div>
            <h1 className="truncate text-lg font-extrabold tracking-tight text-slate-950 sm:text-xl">
              {pageTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
            <span className="text-xs font-bold text-indigo-800">
              {rolesLoaded ? roleNames.join(' · ') || 'No role assigned' : 'Loading role…'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/notifications')}
            className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
          >
            <Bell size={19} />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[10px] font-extrabold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-sm font-extrabold text-white shadow-md shadow-indigo-200 sm:flex">
            {initials}
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-76px)]">
        <aside className="sticky top-[76px] hidden h-[calc(100vh-76px)] w-[285px] shrink-0 border-r border-indigo-100 bg-white lg:block">
          {sidebar}
        </aside>

        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close navigation overlay"
            />
            <aside className="relative z-10 h-full w-[min(88vw,320px)] bg-white shadow-2xl">
              {sidebar}
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-9">
          <div className="mx-auto min-h-[calc(100vh-150px)] w-full max-w-[1440px] rounded-[28px] border border-indigo-100/80 bg-white p-5 shadow-[0_12px_50px_-25px_rgba(79,70,229,0.22)] sm:p-7 lg:rounded-[32px] lg:p-9">
            <Outlet context={{ roles, rolesLoaded }} />
          </div>
          <p className="mx-auto mt-5 max-w-[1440px] px-2 text-center text-xs font-medium text-slate-400">
            ACMS Portal · Conference management workspace
          </p>
        </main>
      </div>
    </div>
  );
}
