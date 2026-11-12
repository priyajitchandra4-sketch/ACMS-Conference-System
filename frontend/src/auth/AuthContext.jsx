import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load current user profile from /auth/me on app mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      authApi.getCurrentUser()
        .then((userData) => {
          setUser(userData);
        })
        .catch((err) => {
          console.error('Failed to authenticate with /auth/me:', err);
          localStorage.removeItem('access_token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    // 1. Get access token from /auth/login
    const data = await authApi.login(email, password);
    localStorage.setItem('access_token', data.access_token);

    // 2. Fetch profile from /auth/me
    const userData = await authApi.getCurrentUser();
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('activeConferenceId'); // do not leak one person's conference to the next login
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);