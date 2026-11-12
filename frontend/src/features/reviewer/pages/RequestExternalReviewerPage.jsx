import React, { useState } from 'react';

export default function RequestExternalReviewerPage() {
  const [formData, setFormData] = useState({ name: '', email: '', reason: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`External reviewer nomination for ${formData.name} submitted to Track Chair.`);
    setFormData({ name: '', email: '', reason: '' });
  };

  return (
    <div className="px-8 lg:px-16 py-12 space-y-10 bg-white max-w-4xl mx-auto">
      <div>
        <span className="inline-block bg-[#f4f1ea] text-[#0f0e13] font-black text-xs uppercase tracking-widest px-4 py-2 rounded-full border-2 border-[#e5e2db] mb-2">
          Specialized Expert Consultation
        </span>
        <h1 className="text-4xl sm:text-5xl font-black text-[#0f0e13]">Request External Reviewer</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#f4f1ea] border-2 border-[#e5e2db] rounded-3xl p-8 sm:p-12 space-y-6 shadow-lg">
        <div className="space-y-2">
          <label className="block text-sm font-black uppercase tracking-wider text-[#0f0e13]">Expert Full Name</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Dr. Alan Turing"
            className="w-full px-5 py-3.5 bg-white border-2 border-[#e5e2db] rounded-2xl text-sm font-extrabold"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-black uppercase tracking-wider text-[#0f0e13]">Expert Email Address</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="turing@institute.ac.uk"
            className="w-full px-5 py-3.5 bg-white border-2 border-[#e5e2db] rounded-2xl text-sm font-extrabold"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-black uppercase tracking-wider text-[#0f0e13]">Justification & Expertise Match</label>
          <textarea
            rows={4}
            required
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="Explain why this external peer reviewer is uniquely qualified to evaluate manuscript P-101..."
            className="w-full p-4 bg-white border-2 border-[#e5e2db] rounded-2xl text-sm font-extrabold"
          />
        </div>

        <button type="submit" className="w-full bg-[#0f0e13] hover:bg-gray-800 text-white font-black py-4 rounded-2xl shadow-xl text-base transition-all cursor-pointer">
          Submit Nomination to Track Chair
        </button>
      </form>
    </div>
  );
}