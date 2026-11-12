import React from 'react';
import { Link } from 'react-router-dom';

const ASSIGNED_PAPERS = [
  { id: 'P-101', title: 'Agentic Multi-Agent Orchestration for Distributed Cloud Systems', track: 'Track 01', dueDate: '2026-04-15', status: 'Pending Review' },
  { id: 'P-102', title: 'Deepfake & Voice Cloning Detection Using Spectral Analysis', track: 'Track 03', dueDate: '2026-04-20', status: 'Review Submitted' },
];

export default function ReviewerAssignmentsPage() {
  return (
    <div className="px-8 lg:px-16 py-12 space-y-10 bg-white max-w-7xl mx-auto">
      <div>
        <span className="inline-block bg-[#f4f1ea] text-[#0f0e13] font-black text-xs uppercase tracking-widest px-4 py-2 rounded-full border-2 border-[#e5e2db] mb-2">
          Reviewer Workspace
        </span>
        <h1 className="text-4xl sm:text-5xl font-black text-[#0f0e13]">My Assignments</h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {ASSIGNED_PAPERS.map((paper) => (
          <div key={paper.id} className="bg-[#f4f1ea] border-2 border-[#e5e2db] rounded-3xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black bg-white px-3 py-1 rounded-lg border-2 border-[#e5e2db]">{paper.id}</span>
                <span className={`text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider ${
                  paper.status === 'Review Submitted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {paper.status}
                </span>
              </div>
              <h3 className="text-2xl font-black text-[#0f0e13]">{paper.title}</h3>
              <p className="text-xs font-extrabold text-gray-600">Due Date: {paper.dueDate} • {paper.track}</p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to={`/reviewer/review/${paper.id}`}
                className="bg-[#0f0e13] hover:bg-gray-800 text-white font-black px-7 py-3.5 rounded-2xl shadow-md text-sm transition-all"
              >
                Open Review Form
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}