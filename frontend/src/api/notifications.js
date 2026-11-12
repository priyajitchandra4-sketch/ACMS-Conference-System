import client from './client';

export const notificationsApi = {
  list: () => client.get('/notifications/').then((r) => r.data),
  unreadCount: () => client.get('/notifications/unread-count').then((r) => r.data),
  markRead: (id) => client.post(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => client.post('/notifications/read-all').then((r) => r.data),
};