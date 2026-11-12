import React from 'react';

export default function StatusBadge({ status, type = 'success' }) {
  const styles = {
    success: 'bg-green-100 text-green-800',
    danger: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-blue-100 text-blue-800',
  };

  const badgeStyle = styles[type] || styles.success;

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold inline-block ${badgeStyle}`}>
      {status}
    </span>
  );
}