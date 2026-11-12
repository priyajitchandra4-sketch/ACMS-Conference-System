import client from './client';

// Paths never start with /api/v1, because client.js already adds the base URL.
export const invitationsApi = {
  // Chair / Track Chair (login required)
  create: (data) => client.post('/invitations/', data).then((r) => r.data),
  list: (params) => client.get('/invitations/', { params }).then((r) => r.data), // { conference_id } or { track_id }
  revoke: (id) => client.post(`/invitations/${id}/revoke`).then((r) => r.data),
  resend: (id) => client.post(`/invitations/${id}/resend`).then((r) => r.data),

  // The invited person (public: the token in the link is the key)
  getByToken: (token) => client.get(`/invitations/${encodeURIComponent(token)}`).then((r) => r.data),
  accept: (token, data = {}) =>
    client.post(`/invitations/${encodeURIComponent(token)}/accept`, data).then((r) => r.data),
  decline: (token) => client.post(`/invitations/${encodeURIComponent(token)}/decline`).then((r) => r.data),
};