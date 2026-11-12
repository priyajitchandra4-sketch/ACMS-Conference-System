import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../../api/auth';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    affiliation: '',
    email: '',
    password: '',
    roles: {
      author: true,
      delegate: false,
    },
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCheckboxChange = (e) => {
    setFormData({
      ...formData,
      roles: { ...formData.roles, [e.target.name]: e.target.checked },
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const selectedRoles = Object.keys(formData.roles).filter((role) => formData.roles[role]);
    if (selectedRoles.length === 0) {
      setError('Please choose at least one role (Author or Delegate).');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    try {
      setLoading(true);
      await authApi.register({
        full_name: formData.fullName,
        affiliation: formData.affiliation,
        email: formData.email,
        password: formData.password,
        roles: selectedRoles,
      });
      navigate('/login');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-white text-[#0f0e13]">
      <div className="max-w-md w-full bg-[#f4f1ea] border-2 border-[#e5e2db] rounded-3xl p-8 sm:p-10 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-block bg-white text-[#0f0e13] font-black text-xs uppercase tracking-widest px-4 py-2 rounded-full border-2 border-[#e5e2db] mb-1 shadow-sm">
            ACMS Portal
          </div>
          <h1 className="text-3xl font-black">Create your account</h1>
          <p className="text-sm font-extrabold text-gray-600">Register for conference participation</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-700 text-xs font-bold rounded-xl">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-black uppercase tracking-wider text-gray-700">Full name</label>
            <input
              type="text"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Ananya Sen"
              className="w-full px-4 py-3 bg-white border-2 border-[#e5e2db] rounded-2xl text-sm font-extrabold focus:outline-none focus:ring-2 focus:ring-[#ff5c35]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-black uppercase tracking-wider text-gray-700">Affiliation</label>
            <input
              type="text"
              name="affiliation"
              value={formData.affiliation}
              onChange={handleChange}
              placeholder="University or organization"
              className="w-full px-4 py-3 bg-white border-2 border-[#e5e2db] rounded-2xl text-sm font-extrabold focus:outline-none focus:ring-2 focus:ring-[#ff5c35]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-black uppercase tracking-wider text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="name@university.edu"
              className="w-full px-4 py-3 bg-white border-2 border-[#e5e2db] rounded-2xl text-sm font-extrabold focus:outline-none focus:ring-2 focus:ring-[#ff5c35]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-black uppercase tracking-wider text-gray-700">Password</label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="At least 8 characters"
              className="w-full px-4 py-3 bg-white border-2 border-[#e5e2db] rounded-2xl text-sm font-extrabold focus:outline-none focus:ring-2 focus:ring-[#ff5c35]"
            />
          </div>

          <div className="space-y-2 pt-2">
            <label className="block text-xs font-black uppercase tracking-wider text-gray-700">I'm joining as</label>
            
            <div className="p-3.5 bg-white border-2 border-[#e5e2db] rounded-2xl flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                name="author"
                checked={formData.roles.author}
                onChange={handleCheckboxChange}
                className="mt-1 h-4 w-4 accent-[#ff5c35]"
              />
              <div>
                <span className="block text-sm font-black text-[#0f0e13]">Author</span>
                <span className="text-xs font-bold text-gray-500">Submit research papers</span>
              </div>
            </div>

            <div className="p-3.5 bg-white border-2 border-[#e5e2db] rounded-2xl flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                name="delegate"
                checked={formData.roles.delegate}
                onChange={handleCheckboxChange}
                className="mt-1 h-4 w-4 accent-[#ff5c35]"
              />
              <div>
                <span className="block text-sm font-black text-[#0f0e13]">Delegate</span>
                <span className="text-xs font-bold text-gray-500">Attend the conference</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0f0e13] hover:bg-gray-800 text-white font-black py-4 rounded-2xl shadow-xl transition-all text-base mt-4 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="text-center text-sm font-extrabold text-gray-600 pt-2 border-t-2 border-[#e5e2db]/60">
          Already have an account?{' '}
          <Link to="/login" className="text-[#ff5c35] font-black hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}