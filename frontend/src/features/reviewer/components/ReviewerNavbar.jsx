import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';

export default function ReviewerNavbar() {
  const navigate = useNavigate();

  const linkClass = ({ isActive }) =>
    isActive
      ? 'text-[#ff5c35] font-black text-sm bg-[#f4f1ea] px-4 py-2.5 rounded-2xl transition-all'
      : 'text-[#0f0e13] hover:text-[#ff5c35] font-extrabold text-sm px-4 py-2.5 rounded-2xl hover:bg-[#f4f1ea]/60 transition-all';

  return (
    <header className="w-full px-8 py-6 flex items-center justify-between border-b-2 border-[#e5e2db] bg-white">
      <div className="flex items-center gap-6">
        <Link to="/reviewer/dashboard" className="flex items-center gap-3 group">
          <div className="bg-[#0f0e13] text-white px-3.5 py-2.5 rounded-2xl font-black text-xs tracking-widest shadow-md">
            ACMS
          </div>
          <span className="font-black text-xl text-[#0f0e13] tracking-tight">Reviewer Portal</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          <NavLink to="/reviewer/dashboard" className={linkClass}>My Assignments</NavLink>
          <NavLink to="/reviewer/expertise" className={linkClass}>Expertise</NavLink>
          <NavLink to="/reviewer/bidding" className={linkClass}>Bidding</NavLink>
          <NavLink to="/reviewer/discussions" className={linkClass}>Discussions</NavLink>
          <NavLink to="/reviewer/request-external" className={linkClass}>External Review</NavLink>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/login')}
          className="bg-red-50 hover:bg-red-100 text-red-600 font-black px-5 py-2.5 rounded-2xl transition-all text-sm border-2 border-red-200 cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}