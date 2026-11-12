import React from 'react';
import { Link, NavLink } from 'react-router-dom';

export default function PublicNavbar() {
  const navLinkClass = ({ isActive }) =>
    isActive
      ? 'text-[#ff5c35] font-bold text-sm bg-[#f4f1ea] px-3.5 py-2 rounded-xl transition-all'
      : 'text-gray-700 hover:text-black font-medium text-sm px-3.5 py-2 rounded-xl hover:bg-[#f4f1ea]/60 transition-all';

  return (
    <header className="w-full px-6 lg:px-12 py-5 flex items-center justify-between border-b border-[#e5e2db] bg-white">
      {/* Brand Logo */}
      <Link to="/" className="flex items-center gap-3 group">
        <div className="bg-[#0f0e13] text-white p-2.5 rounded-xl font-extrabold tracking-wider text-xs shadow-sm group-hover:scale-105 transition-transform">
          ACMS
        </div>
        <span className="font-extrabold text-lg text-[#0f0e13] tracking-tight">
          Symposium
        </span>
      </Link>

      {/* Balanced Navigation Bar: Home, Call for Papers, Login, Register */}
      <nav className="flex items-center gap-1 sm:gap-3">
        <NavLink to="/" end className={navLinkClass}>
          Home
        </NavLink>
        <NavLink to="/cfp" className={navLinkClass}>
          Call for Papers
        </NavLink>
        <NavLink to="/login" className={navLinkClass}>
          Login
        </NavLink>
        <Link
          to="/register"
          className="bg-[#ff5c35] hover:bg-[#e04826] text-white font-bold px-5 py-2 rounded-xl shadow-md shadow-orange-600/20 transition-all text-sm ml-2"
        >
          Register
        </Link>
      </nav>
    </header>
  );
}