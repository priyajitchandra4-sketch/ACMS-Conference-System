import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { rolesApi } from '../api/roles';

// Sends each person to the right home page for their role after login.
export default function DashboardRedirect() {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    rolesApi
  .mine()
  .then((roles) => {
    const names = roles.map((r) => r.role);
    // Check track_chair first so track chairs land on their own dashboard
    if (names.includes('track_chair')) setTarget('/trackchair/invitations');
    else if (names.includes('chair')) setTarget('/chair/conferences');
    else setTarget('/notifications');
  
      })
      .catch(() => setTarget('/notifications'));
  }, []);

  if (!target) {
    return <p className="p-8 text-sm font-extrabold text-gray-500">Loading your dashboard...</p>;
  }
  return <Navigate to={target} replace />;
}