import React from 'react';
import { Navigate, Outlet, useOutletContext } from 'react-router-dom';

/**
 * Only lets people with one of the allowed roles see the pages inside.
 * Everyone else is sent to /dashboard, which picks the right home page for them.
 * (The backend still checks the role on every request; this guard only avoids showing the wrong pages.)
 *
 * Usage in the route table:
 *   { element: <RoleRoute allow={['chair']} />, children: [ ...chair routes... ] }
 */
export default function RoleRoute({ allow }) {
  const ctx = useOutletContext() || { roles: [], rolesLoaded: false };

  if (!ctx.rolesLoaded) {
    return <p className="text-sm font-extrabold text-gray-500">Loading...</p>;
  }

  const allowed = ctx.roles.some((r) => allow.includes(r.role));
  return allowed ? <Outlet context={ctx} /> : <Navigate to="/dashboard" replace />;
}