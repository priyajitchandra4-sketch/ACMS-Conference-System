import React, { useState } from 'react';
import Button from '../../../components/Button';

export default function DeadlineForm({ onSubmit, initialData = null }) {
  const [formData, setFormData] = useState({
    deadline_type: initialData?.deadline_type || 'submission',
    due_at: initialData?.due_at ? initialData.due_at.slice(0, 16) : '',
    grace_period_minutes: initialData?.grace_period_minutes || 0,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      due_at: new Date(formData.due_at).toISOString(),
      grace_period_minutes: parseInt(formData.grace_period_minutes, 10),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Deadline Type</label>
        <select
          value={formData.deadline_type}
          onChange={(e) => setFormData({ ...formData, deadline_type: e.target.value })}
          className="w-full border rounded p-2"
        >
          <option value="submission">Submission</option>
          <option value="review">Review Due</option>
          <option value="rebuttal">Rebuttal</option>
          <option value="camera_ready">Camera Ready</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Due Date & Time (UTC)</label>
        <input
          type="datetime-local"
          value={formData.due_at}
          onChange={(e) => setFormData({ ...formData, due_at: e.target.value })}
          className="w-full border rounded p-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Grace Period (Minutes)</label>
        <input
          type="number"
          min="0"
          value={formData.grace_period_minutes}
          onChange={(e) => setFormData({ ...formData, grace_period_minutes: e.target.value })}
          className="w-full border rounded p-2"
          required
        />
      </div>

      <div className="md:col-span-3 flex justify-end">
        <Button type="submit">Save Deadline</Button>
      </div>
    </form>
  );
}