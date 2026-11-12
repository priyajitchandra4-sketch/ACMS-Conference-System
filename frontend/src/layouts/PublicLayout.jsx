import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#0f0e13]">
      {/* Top Navigation Bar */}
      <header className="border-b-2 border-[#e5e2db] bg-[#f4f1ea] px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-6">
          <Link to="/" className="font-black text-xl tracking-tight text-[#0f0e13] flex items-center gap-2">
            <span className="bg-[#0f0e13] text-white px-2.5 py-1 rounded-xl text-xs uppercase tracking-widest">
              ACMS
            </span>
            Portal
          </Link>
          <nav className="hidden md:flex space-x-6 text-sm font-extrabold text-gray-700">
            <Link to="/" className="hover:text-[#ff5c35] transition">Conferences</Link>
            <Link to="/cfp" className="hover:text-[#ff5c35] transition">Call for Papers</Link>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <Link
            to="/login"
            className="text-sm font-black text-[#0f0e13] hover:text-[#ff5c35] px-4 py-2 transition"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="bg-[#0f0e13] hover:bg-gray-800 text-white text-sm font-black px-5 py-2.5 rounded-2xl shadow-md transition"
          >
            Register
          </Link>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-[#f4f1ea] border-t-2 border-[#e5e2db] py-6 px-8 text-center text-xs font-bold text-gray-600">
        <p>Academic Conference Management System (ACMS) • Built with FastAPI, PostgreSQL & React</p>
      </footer>
    </div>
  );
}