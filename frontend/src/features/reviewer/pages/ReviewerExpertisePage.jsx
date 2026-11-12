import React, { useState } from 'react';

export default function ReviewerExpertisePage() {
  const [tags, setTags] = useState(['Machine Learning', 'LLMs', 'Distributed Systems', 'Cryptography']);
  const [newTag, setNewTag] = useState('');

  const addTag = (e) => {
    e.preventDefault();
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  return (
    <div className="px-8 lg:px-16 py-12 space-y-10 bg-white max-w-5xl mx-auto">
      <div>
        <span className="inline-block bg-[#f4f1ea] text-[#0f0e13] font-black text-xs uppercase tracking-widest px-4 py-2 rounded-full border-2 border-[#e5e2db] mb-2">
          Reviewer Settings
        </span>
        <h1 className="text-4xl sm:text-5xl font-black text-[#0f0e13]">Expertise Profile</h1>
        <p className="text-sm font-extrabold text-gray-600 mt-1">
          Manage your subject keywords to help track chairs assign relevant manuscripts.
        </p>
      </div>

      <div className="bg-[#f4f1ea] border-2 border-[#e5e2db] rounded-3xl p-8 space-y-8 shadow-sm">
        <div className="space-y-4">
          <h2 className="text-xl font-black text-[#0f0e13]">Active Expertise Keywords</h2>
          <div className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <span key={tag} className="bg-white border-2 border-[#e5e2db] px-4 py-2.5 rounded-2xl font-black text-sm text-[#0f0e13] flex items-center gap-3 shadow-sm">
                {tag}
                <button onClick={() => removeTag(tag)} className="text-red-500 hover:text-red-700 font-black cursor-pointer">×</button>
              </span>
            ))}
          </div>
        </div>

        <form onSubmit={addTag} className="flex gap-4 pt-4 border-t-2 border-[#e5e2db]">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add new keyword (e.g., Zero-Trust Security)..."
            className="flex-grow px-5 py-3.5 bg-white border-2 border-[#e5e2db] rounded-2xl text-sm font-extrabold focus:outline-none focus:ring-2 focus:ring-[#ff5c35]"
          />
          <button type="submit" className="bg-[#0f0e13] hover:bg-gray-800 text-white font-black px-8 py-3.5 rounded-2xl shadow-md text-sm transition-all cursor-pointer">
            Add Keyword
          </button>
        </form>
      </div>
    </div>
  );
}