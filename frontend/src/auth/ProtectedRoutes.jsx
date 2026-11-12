import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function ProtectedRoute({ allowedRoles = [] }) {
  const auth = useAuth();

  // Safety guard if AuthProvider is missing in the tree
  if (!auth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm font-bold text-red-600">
          Error: AuthProvider wrapper is missing around your router.
        </p>
      </div>
    );
  }

  const { user, loading } = auth;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm font-bold text-gray-500 animate-pulse">Loading ACMS Portal...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length >0) {
    const hasRole = user.roles?.some(role => allowedRoles.includes(role));
    if (!hasRole) {
      return <Navigate to="/403" replace />;
    }
  }

  return <Outlet />;
}