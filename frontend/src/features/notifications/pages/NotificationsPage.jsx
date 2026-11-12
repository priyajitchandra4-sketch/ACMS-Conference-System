import React, { useState, useEffect, useCallback } from 'react';
import { notificationsApi } from '../../../api/notifications';
import { apiError } from '../../../utils/apiError';
import { parseUtc } from '../../../utils/dates';

// Tells the sidebar to refresh its unread badge
const announceChange = () => window.dispatchEvent(new Event('notifications:changed'));

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setItems(await notificationsApi.list());
      setError('');
    } catch (err) {
      setError(apiError(err, 'Could not load notifications.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRead = async (n) => {
    if (n.is_read) return;
    try {
      await notificationsApi.markRead(n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      announceChange();
    } catch (err) {
      setError(apiError(err, 'Could not update the notification.'));
    }
  };

  const handleReadAll = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
      announceChange();
    } catch (err) {
      setError(apiError(err, 'Could not update the notifications.'));
    }
  };

  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="border-b-2 border-[#e5e2db] pb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-[#0f0e13]">Notifications</h2>
          <p className="text-sm font-extrabold text-gray-600 mt-1">
            {unread > 0 ? `${unread} unread` : 'You are all caught up'}
          </p>
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={handleReadAll}
            className="px-4 py-2 bg-[#f4f1ea] border-2 border-[#e5e2db] text-[#0f0e13] font-black text-xs rounded-xl hover:bg-gray-200 cursor-pointer"
          >
            Mark all as read
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-100 border-2 border-red-300 text-red-700 text-xs font-bold rounded-2xl">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm font-extrabold text-gray-500">Loading notifications...</p>
      ) : items.length === 0 ? (
        <div className="p-10 text-center bg-[#f4f1ea] border-2 border-dashed border-[#e5e2db] rounded-3xl">
          <p className="text-sm font-extrabold text-gray-600">No notifications yet.</p>
        </div>
      ) : (
        <ul className="space-y-3 max-w-3xl">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => handleRead(n)}
                className={`w-full text-left p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  n.is_read
                    ? 'bg-white border-[#e5e2db]'
                    : 'bg-[#f4f1ea] border-[#0f0e13] shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-[#0f0e13]">{n.title}</p>
                    <p className="text-sm font-extrabold text-gray-600 mt-1">{n.message}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {!n.is_read && (
                      <span className="inline-block bg-[#ff5c35] text-white text-[10px] font-black px-2 py-0.5 rounded-full mb-1">
                        New
                      </span>
                    )}
                    <p className="text-xs font-extrabold text-gray-500">
                      {n.created_at ? parseUtc(n.created_at).toLocaleString() : ''}
                    </p>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}