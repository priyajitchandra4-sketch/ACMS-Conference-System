import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
          <p className="text-sm text-gray-500 mt-1">Enter your email to receive a secure recovery link</p>
        </div>

        {submitted ? (
          <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg text-center text-sm">
            If an account exists for {email}, password reset instructions have been sent.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-900 focus:outline-none"
                placeholder="scholarly@university.edu"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-red-900 hover:bg-red-800 text-white font-medium py-2.5 rounded-lg transition"
            >
              Send Reset Link
            </button>
          </form>
        )}

        <div className="text-center text-sm">
          <Link to="/login" className="text-red-800 font-semibold hover:underline">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}