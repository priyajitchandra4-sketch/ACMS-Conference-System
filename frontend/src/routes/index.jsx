import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layouts
import PublicLayout from '../layouts/PublicLayout';
import DashboardLayout from '../layouts/DashboardLayout';

// Protected Route Guard (the file must be named ProtectedRoutes.jsx)
import ProtectedRoute from '../auth/ProtectedRoutes';
import DashboardRedirect from './DashboardRedirect';
import RoleRoute from './RoleRoute';

// Public & Auth Pages
import LandingPage from '../features/public/pages/LandingPage';
import CallForPapersPage from '../features/public/pages/CallForPapersPage';
import LoginPage from '../features/public/pages/LoginPage';
import RegisterPage from '../features/public/pages/RegisterPage';
import AcceptInvitePage from '../features/public/pages/AcceptInvitePage';
import ForgotPasswordPage from '../features/public/pages/ForgotPasswordPage';

// Chair Pages
import ConferenceSettingsPage from '../features/chair/pages/ConferenceSettingsPage';
import DeadlineManagerPage from '../features/chair/pages/DeadlineManagerPage';
import TracksManagerPage from '../features/chair/pages/TracksManagerPage';
import CfpEditorPage from '../features/chair/pages/CfpEditorPage';
import ProgramCommitteePage from '../features/chair/pages/ProgramCommitteePage';

// Track Chair + shared pages
import InviteReviewersPage from '../features/trackchair/pages/InviteReviewerPage';
import NotificationsPage from '../features/notifications/pages/NotificationsPage';

// Author Pages
import MyPapersPage from '../features/author/pages/MyPapersPage';
import NewSubmissionPage from '../features/author/pages/NewSubmissionPage';

// Phase 5 — Reviewer Pages
import ExpertiseProfilePage from '../features/reviewer/pages/ExpertiseProfilePage';
import BiddingPage from '../features/reviewer/pages/BiddingPage';
import MyAssignmentsPage from '../features/reviewer/pages/MyAssignmentsPage';

// Phase 5 — Meta-Reviewer Pages
import MetaPapersPage from '../features/meta/pages/MetaPapersPage';
import AssignReviewersPage from '../features/meta/pages/AssignReviewersPage';

// Phase 5 — Track Chair Pages
import AssignmentsManagerPage from '../features/trackchair/pages/AssignmentsManagerPage';

// Phase 6 — Reviews, discussion and progress
import ReviewWorkspacePage from '../features/reviewer/pages/ReviewWorkspacePage';
import ManagerReviewsPage from '../features/meta/pages/ManagerReviewsPage';
import ReviewProgressPage from '../features/trackchair/pages/ReviewProgressPage';

// Phases 7–10 — decisions, external reviewers, delegates, reporting/security
import DecisionQueuePage from '../features/chair/pages/DecisionQueuePage';
import DelegatePaymentsPage from '../features/chair/pages/DelegatePaymentsPage';
import PaperDecisionPage from '../features/meta/pages/PaperDecisionPage';
import DecisionRebuttalPage from '../features/author/pages/DecisionRebuttalPage';
import AuthorDecisionsPage from '../features/author/pages/AuthorDecisionsPage';
import CameraReadyPage from '../features/author/pages/CameraReadyPage';
import ExternalAssignmentsPage from '../features/external/pages/ExternalAssignmentsPage';
import ExternalReviewPage from '../features/external/pages/ExternalReviewPage';
import ExternalReviewManagerPage from '../features/trackchair/pages/ExternalReviewManagerPage';
import DelegatePortalPage from '../features/delegate/pages/DelegatePortalPage';
import ReportsDashboardPage from '../features/reports/pages/ReportsDashboardPage';
import AuditLogPage from '../features/reports/pages/AuditLogPage';
import SecurityOverviewPage from '../features/reports/pages/SecurityOverviewPage';

export const router = createBrowserRouter([
  // Public Routes (Landing, CFP, Auth, Invitations)
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/cfp', element: <CallForPapersPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/invite/:token', element: <AcceptInvitePage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
    ],
  },

  // Protected Dashboard Routes
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: '/dashboard', element: <DashboardRedirect /> },

          // Chair only
          {
            element: <RoleRoute allow={['chair']} />,
            children: [
              { path: '/chair/conferences', element: <ConferenceSettingsPage /> },
              { path: '/chair/conferences/new', element: <ConferenceSettingsPage /> },
              { path: '/chair/conferences/:conferenceId/overview', element: <ConferenceSettingsPage /> },
              { path: '/chair/conferences/:conferenceId/settings', element: <ConferenceSettingsPage /> },
              { path: '/chair/conferences/:conferenceId/deadlines', element: <DeadlineManagerPage /> },
              { path: '/chair/conferences/:conferenceId/tracks', element: <TracksManagerPage /> },
              { path: '/chair/conferences/:conferenceId/cfp', element: <CfpEditorPage /> },
              { path: '/chair/conferences/:conferenceId/committee', element: <ProgramCommitteePage /> },
              { path: '/chair/decisions', element: <DecisionQueuePage /> },
              { path: '/chair/delegates', element: <DelegatePaymentsPage /> },
              { path: '/chair/reports', element: <ReportsDashboardPage /> },
              { path: '/chair/audit-log', element: <AuditLogPage /> },
              { path: '/chair/security', element: <SecurityOverviewPage /> },
            ],
          },

          // Track Chair only
          {
            element: <RoleRoute allow={['track_chair']} />,
            children: [
              { path: '/trackchair/invitations', element: <InviteReviewersPage /> },
            ],
          },

          // Author only
          {
            element: <RoleRoute allow={['author']} />,
            children: [
              { path: '/author/papers', element: <MyPapersPage /> },
              { path: '/author/decisions', element: <AuthorDecisionsPage /> },
              { path: '/author/papers/:id', element: <NewSubmissionPage /> },
              { path: '/author/papers/:id/decision', element: <DecisionRebuttalPage /> },
              { path: '/author/papers/:id/rebuttal', element: <DecisionRebuttalPage /> },
              { path: '/author/papers/:id/camera-ready', element: <CameraReadyPage /> },
            ],
          },

          // Phase 5 — Reviewer only
          {
            element: <RoleRoute allow={['reviewer']} />,
            children: [
              { path: '/reviewer', element: <Navigate to="/reviewer/bidding" replace /> },
              { path: '/reviewer/expertise', element: <ExpertiseProfilePage /> },
              { path: '/reviewer/bidding', element: <BiddingPage /> },
              { path: '/reviewer/assignments', element: <MyAssignmentsPage /> },
              { path: '/reviewer/reviews/:paperId', element: <ReviewWorkspacePage /> },
            ],
          },

          // Phase 5 — Meta-Reviewer only
          {
            element: <RoleRoute allow={['meta_reviewer']} />,
            children: [
              { path: '/meta', element: <Navigate to="/meta/papers" replace /> },
              { path: '/meta/papers', element: <MetaPapersPage /> },
              { path: '/meta/decisions', element: <DecisionQueuePage /> },
            ],
          },

          // Phase 5 — Meta-Reviewer, Track Chair and Chair can assign reviewers
          {
            element: <RoleRoute allow={['meta_reviewer', 'track_chair', 'chair']} />,
            children: [
              { path: '/meta/papers/:paperId/assign-reviewers', element: <AssignReviewersPage /> },
              { path: '/meta/papers/:paperId/reviews', element: <ManagerReviewsPage /> },
              { path: '/meta/papers/:paperId/decision', element: <PaperDecisionPage /> },
            ],
          },

          // Phase 5 — Track Chair and Chair manage assignments
          {
            element: <RoleRoute allow={['track_chair', 'chair']} />,
            children: [
              { path: '/trackchair/assignments', element: <AssignmentsManagerPage /> },
              { path: '/trackchair/review-progress', element: <ReviewProgressPage /> },
              { path: '/trackchair/external-reviewers', element: <ExternalReviewManagerPage /> },
            ],
          },

          // Phase 8 — external reviewers (backend role: external_reviewer)
          {
            element: <RoleRoute allow={['external_reviewer']} />,
            children: [
              { path: '/external', element: <Navigate to='/external/assignments' replace /> },
              { path: '/external/assignments', element: <ExternalAssignmentsPage /> },
              { path: '/external/reviews/:paperId', element: <ExternalReviewPage /> },
            ],
          },

          // Phase 9 — delegates
          {
            element: <RoleRoute allow={['delegate']} />,
            children: [
              { path: '/delegate', element: <Navigate to='/delegate/registration' replace /> },
              { path: '/delegate/registration', element: <DelegatePortalPage /> },
              { path: '/delegate/payment', element: <DelegatePortalPage /> },
            ],
          },

          // Everyone
          { path: '/notifications', element: <NotificationsPage /> },
        ],
      },
    ],
  },

  // 403 Forbidden View
  {
    path: '/403',
    element: (
      <div className="min-h-screen flex items-center justify-center bg-[#121214] p-4">
        <div className="bg-[#18181b] border border-white/10 rounded-2xl p-8 max-w-md text-center shadow-2xl text-white">
          <h1 className="text-4xl font-bold text-[#ff5c35] mb-2">403</h1>
          <h2 className="text-xl font-bold text-white mb-4">Access Forbidden</h2>
          <p className="text-sm text-gray-400 mb-6">
            You do not have the required role permissions to view this portal.
          </p>
          <a
            href="/login"
            className="inline-block bg-white text-slate-900 font-semibold px-6 py-2.5 rounded-xl text-sm"
          >
            Return to Login
          </a>
        </div>
      </div>
    ),
  },

  // Catch-all Redirect
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
