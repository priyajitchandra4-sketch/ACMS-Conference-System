import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthContext';

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      navigate('/dashboard', { replace: true }); // DashboardRedirect picks the home page for the person's role
    } catch (err) {
      console.error('Login error:', err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-white text-[#0f0e13]">
      <div className="max-w-md w-full bg-[#f4f1ea] border-2 border-[#e5e2db] rounded-3xl p-8 sm:p-10 shadow-xl space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-block bg-white text-[#0f0e13] font-black text-xs uppercase tracking-widest px-4 py-2 rounded-full border-2 border-[#e5e2db] mb-2 shadow-sm">
            ACMS Portal
          </div>
          <h1 className="text-3xl font-black">Welcome Back</h1>
          <p className="text-sm font-extrabold text-gray-600">Sign in to access your conference dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-700 text-xs font-bold rounded-xl">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-gray-700">Email Address</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="user@university.edu"
              className="w-full px-5 py-3.5 bg-white border-2 border-[#e5e2db] rounded-2xl text-sm font-extrabold focus:outline-none focus:ring-2 focus:ring-[#ff5c35]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black uppercase tracking-wider text-gray-700">Password</label>
              <Link to="/forgot-password" className="text-xs text-[#ff5c35] font-black hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-5 py-3.5 bg-white border-2 border-[#e5e2db] rounded-2xl text-sm font-extrabold focus:outline-none focus:ring-2 focus:ring-[#ff5c35]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0f0e13] hover:bg-gray-800 text-white font-black py-4 rounded-2xl shadow-xl transition-all text-base mt-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In to Dashboard'}
          </button>
        </form>

        <div className="text-center text-sm font-extrabold text-gray-600 pt-2 border-t-2 border-[#e5e2db]/60">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#ff5c35] font-black hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}