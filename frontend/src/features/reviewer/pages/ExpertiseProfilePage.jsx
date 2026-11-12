import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { biddingApi } from '../../../api/bidding';

const LEVELS = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'High' },
];

export default function ExpertiseProfilePage() {
  const queryClient = useQueryClient();
  const [levels, setLevels] = useState({});
  const [saved, setSaved] = useState(false);

  const areasQuery = useQuery({
    queryKey: ['bidding', 'subject-areas'],
    queryFn: biddingApi.getSubjectAreas,
  });

  const expertiseQuery = useQuery({
    queryKey: ['bidding', 'expertise'],
    queryFn: biddingApi.getExpertise,
  });

  useEffect(() => {
    if (expertiseQuery.data) {
      const map = {};
      expertiseQuery.data.forEach((e) => {
        map[e.subject_area_id] = e.level;
      });
      setLevels(map);
    }
  }, [expertiseQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const items = Object.entries(levels)
        .filter(([, level]) => level > 0)
        .map(([id, level]) => ({ subject_area_id: Number(id), level }));
      return biddingApi.setExpertise(items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bidding', 'expertise'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  if (areasQuery.isLoading || expertiseQuery.isLoading) {
    return <p className="p-6 text-gray-400">Loading subject areas…</p>;
  }

  if (areasQuery.isError) {
    return (
      <p className="p-6 text-red-400">
        Failed to load: {areasQuery.error?.response?.data?.detail || areasQuery.error.message}
      </p>
    );
  }

  const areas = areasQuery.data || [];

  return (
    <div className="p-6 max-w-2xl text-white">
      <h1 className="text-2xl font-bold mb-1">Expertise Profile</h1>
      <p className="text-gray-400 mb-6">
        Tell us which subject areas you know best. This helps Meta-Reviewers match you to
        the right papers. Leave an area at “—” if it is not your field.
      </p>

      {areas.length === 0 && (
        <p className="text-gray-500">No subject areas are configured for your tracks yet.</p>
      )}

      <div className="bg-[#18181b] border border-white/10 rounded-2xl divide-y divide-white/10">
        {areas.map((area) => (
          <div key={area.id} className="flex items-center justify-between px-4 py-3">
            <span className="font-medium">{area.name}</span>
            <select
              className="bg-[#121214] border border-white/10 rounded-lg px-2 py-1 text-white"
              value={levels[area.id] || 0}
              onChange={(e) =>
                setLevels((prev) => ({ ...prev, [area.id]: Number(e.target.value) }))
              }
            >
              <option value={0}>—</option>
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || areas.length === 0}
          className="bg-[#ff5c35] text-white px-4 py-2 rounded-xl hover:opacity-90 disabled:opacity-50"
        >
          {saveMutation.isPending ? 'Saving…' : 'Save Expertise'}
        </button>
        {saved && <span className="text-green-400">Saved ✓</span>}
        {saveMutation.isError && (
          <span className="text-red-400">
            {saveMutation.error?.response?.data?.detail || 'Save failed'}
          </span>
        )}
      </div>
    </div>
  );
}
