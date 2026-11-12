import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function ReviewFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    score: '8',
    confidence: '4 - High',
    summary: '',
    strengths: '',
    weaknesses: '',
    confidential: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Review for manuscript ${id} submitted successfully!`);
    navigate('/reviewer/dashboard');
  };

  const handleDownloadPDF = () => {
    alert(`Downloading anonymous manuscript PDF for #${id}... (Simulated file download)`);
  };

  return (
    <div className="px-8 lg:px-16 py-12 space-y-10 bg-white max-w-4xl mx-auto">
      
      {/* Header & Back Link */}
      <div>
        <span className="text-xs font-black uppercase tracking-wider text-[#ff5c35]">Double-Blind Evaluation</span>
        <h1 className="text-3xl sm:text-4xl font-black text-[#0f0e13] mt-1">Review Manuscript (#{id})</h1>
        <p className="text-sm font-extrabold text-gray-600 mt-1">
          Agentic Multi-Agent Orchestration for Distributed Cloud Systems
        </p>
      </div>

      {/* NEW: Manuscript Reader / Download Card */}
      <div className="bg-[#f4f1ea] border-2 border-[#e5e2db] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2">
          <span className="text-xs font-black bg-white px-3 py-1 rounded-lg border-2 border-[#e5e2db] uppercase tracking-wider text-gray-600">
            Anonymous PDF Document
          </span>
          <h3 className="text-lg font-black text-[#0f0e13]">Review Manuscript File</h3>
          <p className="text-xs font-extrabold text-gray-600">
            Authors' identities have been scrubbed to ensure strict double-blind review integrity.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="w-full sm:w-auto bg-[#0f0e13] hover:bg-gray-800 text-white font-black px-6 py-3 rounded-2xl shadow-md text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            📥 Download / View PDF
          </button>
        </div>
      </div>

      {/* Review Form */}
      <form onSubmit={handleSubmit} className="bg-[#f4f1ea] border-2 border-[#e5e2db] rounded-3xl p-8 sm:p-12 space-y-8 shadow-lg">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-black uppercase tracking-wider text-[#0f0e13]">Evaluation Score (1-10)</label>
            <select
              value={formData.score}
              onChange={(e) => setFormData({ ...formData, score: e.target.value })}
              className="w-full px-5 py-3.5 bg-white border-2 border-[#e5e2db] rounded-2xl text-sm font-black cursor-pointer"
            >
              <option value="10">10 - Award Quality</option>
              <option value="8">8 - Strong Accept</option>
              <option value="6">6 - Weak Accept</option>
              <option value="4">4 - Borderline</option>
              <option value="2">2 - Reject</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-black uppercase tracking-wider text-[#0f0e13]">Reviewer Confidence</label>
            <select
              value={formData.confidence}
              onChange={(e) => setFormData({ ...formData, confidence: e.target.value })}
              className="w-full px-5 py-3.5 bg-white border-2 border-[#e5e2db] rounded-2xl text-sm font-black cursor-pointer"
            >
              <option value="5 - Expert">5 - Expert</option>
              <option value="4 - High">4 - High</option>
              <option value="3 - Medium">3 - Medium</option>
              <option value="2 - Low">2 - Low</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-black uppercase tracking-wider text-[#0f0e13]">Paper Summary</label>
          <textarea
            rows={4}
            required
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            placeholder="Summarize the paper's primary contributions and methodology..."
            className="w-full p-4 bg-white border-2 border-[#e5e2db] rounded-2xl text-sm font-extrabold"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-black uppercase tracking-wider text-[#0f0e13]">Strengths</label>
          <textarea
            rows={4}
            required
            value={formData.strengths}
            onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
            placeholder="Highlight technical rigor, clarity, and novelty..."
            className="w-full p-4 bg-white border-2 border-[#e5e2db] rounded-2xl text-sm font-extrabold"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-black uppercase tracking-wider text-[#0f0e13]">Weaknesses & Constructive Feedback</label>
          <textarea
            rows={4}
            required
            value={formData.weaknesses}
            onChange={(e) => setFormData({ ...formData, weaknesses: e.target.value })}
            placeholder="Detail areas for improvement, missing baselines, or limitations..."
            className="w-full p-4 bg-white border-2 border-[#e5e2db] rounded-2xl text-sm font-extrabold"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-[#ff5c35] hover:bg-[#e04826] text-white font-black py-4 rounded-2xl shadow-xl text-base transition-all cursor-pointer"
        >
          Submit Final Review Score & Comments
        </button>
      </form>
    </div>
  );
}