import React, { useState } from 'react';

export default function PaperDiscussionPage() {
  const [messages, setMessages] = useState([
    { id: 1, author: 'Reviewer #1', text: 'Has everyone checked the benchmark latency figures in Section 4?' },
    { id: 2, author: 'Reviewer #2', text: 'Yes, they look solid, though I asked for clarification on peak concurrency.' },
  ]);
  const [newMsg, setNewMsg] = useState('');

  const sendPost = (e) => {
    e.preventDefault();
    if (newMsg) {
      setMessages([...messages, { id: Date.now(), author: 'You (Reviewer)', text: newMsg }]);
      setNewMsg('');
    }
  };

  return (
    <div className="px-8 lg:px-16 py-12 space-y-10 bg-white max-w-5xl mx-auto">
      <div>
        <span className="inline-block bg-[#f4f1ea] text-[#0f0e13] font-black text-xs uppercase tracking-widest px-4 py-2 rounded-full border-2 border-[#e5e2db] mb-2">
          Committee Collaboration
        </span>
        <h1 className="text-4xl sm:text-5xl font-black text-[#0f0e13]">Paper Discussion (P-101)</h1>
      </div>

      <div className="bg-[#f4f1ea] border-2 border-[#e5e2db] rounded-3xl p-8 space-y-8 shadow-sm">
        <div className="space-y-4">
          {messages.map((m) => (
            <div key={m.id} className="bg-white p-6 rounded-2xl border-2 border-[#e5e2db] space-y-1 shadow-sm">
              <span className="text-xs font-black text-[#ff5c35] uppercase tracking-wider">{m.author}</span>
              <p className="text-sm font-extrabold text-[#0f0e13]">{m.text}</p>
            </div>
          ))}
        </div>

        <form onSubmit={sendPost} className="flex gap-4 pt-4 border-t-2 border-[#e5e2db]">
          <input
            type="text"
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            placeholder="Post a discussion comment to fellow reviewers & meta-reviewer..."
            className="flex-grow px-5 py-3.5 bg-white border-2 border-[#e5e2db] rounded-2xl text-sm font-extrabold focus:outline-none focus:ring-2 focus:ring-[#ff5c35]"
          />
          <button type="submit" className="bg-[#0f0e13] hover:bg-gray-800 text-white font-black px-8 py-3.5 rounded-2xl shadow-md text-sm transition-all cursor-pointer">
            Post Comment
          </button>
        </form>
      </div>
    </div>
  );
}