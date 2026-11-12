import React, { useState } from 'react';

const MOCK_BID_PAPERS = [
  { id: 'P-301', title: 'Federated Learning with Differential Privacy in Edge Clouds', track: 'Track 01', bid: 'High' },
  { id: 'P-302', title: 'Post-Quantum Cryptography in TLS 1.4 Protocols', track: 'Track 03', bid: 'Will Review' },
  { id: 'P-303', title: 'Automated Formal Verification of Microprocessor ALU Circuits', track: 'Track 04', bid: 'No Bid' },
];

export default function ReviewerBiddingPage() {
  const [bids, setBids] = useState(
    MOCK_BID_PAPERS.reduce((acc, p) => ({ ...acc, [p.id]: p.bid }), {})
  );
  const [filterTrack, setFilterTrack] = useState('All');

  const handleBidChange = (id, newBid) => {
    setBids({ ...bids, [id]: newBid });
  };

  const filteredPapers = MOCK_BID_PAPERS.filter(p => filterTrack === 'All' || p.track === filterTrack);

  return (
    <div className="px-8 lg:px-16 py-12 space-y-10 bg-white max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b-2 border-[#e5e2db] pb-8">
        <div>
          <span className="inline-block bg-[#f4f1ea] text-[#0f0e13] font-black text-xs uppercase tracking-widest px-4 py-2 rounded-full border-2 border-[#e5e2db] mb-2">
            Paper Bidding Phase
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-[#0f0e13]">Manuscript Bidding</h1>
        </div>

        <select
          value={filterTrack}
          onChange={(e) => setFilterTrack(e.target.value)}
          className="px-5 py-3.5 bg-[#f4f1ea] border-2 border-[#e5e2db] rounded-2xl text-sm font-black cursor-pointer"
        >
          <option value="All">All Tracks</option>
          <option value="Track 01">Track 01: AI & Data Science</option>
          <option value="Track 03">Track 03: Cybersecurity</option>
          <option value="Track 04">Track 04: Software Engineering</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredPapers.map((paper) => (
          <div key={paper.id} className="bg-[#f4f1ea] border-2 border-[#e5e2db] rounded-3xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
            <div className="space-y-2 max-w-3xl">
              <span className="text-xs font-black bg-white px-3 py-1 rounded-lg border-2 border-[#e5e2db]">{paper.id} • {paper.track}</span>
              <h3 className="text-2xl font-black text-[#0f0e13]">{paper.title}</h3>
            </div>

            <div className="flex items-center gap-3">
              {['High', 'Will Review', 'Low', 'No Bid'].map((option) => (
                <button
                  key={option}
                  onClick={() => handleBidChange(paper.id, option)}
                  className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                    bids[paper.id] === option
                      ? 'bg-[#0f0e13] text-white shadow-md'
                      : 'bg-white text-[#0f0e13] border-2 border-[#e5e2db] hover:bg-gray-50'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}