import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="px-8 lg:px-16 py-12 space-y-16 bg-white">
      
      {/* Original Hero Layout: Bold Typography (Left) & Full Auditorium Image Showcase (Right) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Hero Content */}
        <div className="lg:col-span-7 space-y-8">
          <span className="inline-block bg-[#f4f1ea] text-[#0f0e13] font-black text-xs uppercase tracking-widest px-5 py-2.5 rounded-full border-2 border-[#e5e2db]">
            ACMS 2026 International Symposium
          </span>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-[#0f0e13] leading-[1.08]">
            Every manuscript <span className="text-[#ff5c35]">reviewed</span> before deadlines wait.
          </h1>
          
          <p className="text-lg sm:text-2xl text-[#4a4552] font-extrabold leading-relaxed max-w-2xl">
            Streamlining double-blind peer reviews, multi-tier committee assignments, and multi-step author submissions with real-time autosave.
          </p>

          <div className="flex flex-wrap items-center gap-5 pt-3">
            <Link
              to="/register"
              className="bg-[#0f0e13] hover:bg-gray-800 text-white font-black px-9 py-4.5 rounded-2xl shadow-xl transition-all text-lg"
            >
              Author & Delegate Sign Up
            </Link>
            <Link
              to="/cfp"
              className="bg-[#f4f1ea] hover:bg-[#ece8df] text-[#0f0e13] font-black px-9 py-4.5 rounded-2xl border-2 border-[#e5e2db] transition-all text-lg"
            >
              Call for Papers
            </Link>
          </div>
        </div>

        {/* Right Auditorium Image Showcase Card */}
        <div className="lg:col-span-5">
          <div className="bg-[#f4f1ea] p-4 rounded-3xl border-2 border-[#e5e2db] shadow-xl">
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-gray-200">
              <img 
                src="/auditorium.jpg" 
                alt="Conference Auditorium" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800";
                }}
              />
              <div className="absolute bottom-4 left-4 bg-[#0f0e13]/90 backdrop-blur-md text-white text-sm px-4 py-2 rounded-2xl font-black border border-white/20 shadow-lg">
                Keynote Auditorium • Main Track
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* Feature Bento Grid Section */}
      <section className="bg-[#f4f1ea] rounded-3xl p-10 sm:p-14 border-2 border-[#e5e2db] space-y-10">
        <div className="max-w-3xl space-y-3">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0f0e13]">
            Symposium Architecture
          </h2>
          <p className="text-[#4a4552] text-lg sm:text-xl font-extrabold">
            End-to-end management built for double-blind integrity, track coordination, and proceedings publishing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { num: '01', title: 'Double-Blind Review Integrity', desc: 'Strict isolation preventing disclosure of author and reviewer identities throughout peer evaluation.' },
            { num: '02', title: 'Autosave Submission Wizard', desc: 'Multi-step wizard with real-time draft saving for abstracts, keywords, co-authors, and manuscript uploads.' },
            { num: '03', title: 'Track Chair Oversight', desc: 'Dedicated dashboards for assigning reviewers, synthesizing meta-reviews, and declaring final acceptance decisions.' },
            { num: '04', title: 'Author Rebuttals & Revisions', desc: 'Configurable windows allowing authors to submit rebuttal statements and updated camera-ready manuscripts.' },
            { num: '05', title: 'Proceedings & Publication', desc: 'Automated compilation and verification of camera-ready PDFs by proceedings editors for official publishing.' },
            { num: '06', title: 'Role-Based Access Control', desc: 'Granular permission levels for Authors, Reviewers, Meta Reviewers, Track Chairs, and Conference Chairs.' }
          ].map((item) => (
            <div key={item.num} className="bg-white p-8 rounded-3xl border-2 border-[#e5e2db] shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#ff5c35] flex items-center justify-center font-black text-xl">
                {item.num}
              </div>
              <h3 className="text-xl font-black text-[#0f0e13]">{item.title}</h3>
              <p className="text-[#4a4552] text-base font-extrabold leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}