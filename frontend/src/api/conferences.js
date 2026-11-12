import client from './client';

// client.js already adds the base URL (http://localhost:8000/api/v1),
// so every path here starts with /conferences, never /api/v1.
export const conferencesApi = {
  list: () => client.get('/conferences/').then((r) => r.data),
  create: (data) => client.post('/conferences/', data).then((r) => r.data),
  getById: (id) => client.get(`/conferences/${id}`).then((r) => r.data),
  update: (id, data) => client.patch(`/conferences/${id}`, data).then((r) => r.data),

  listDeadlines: (id) => client.get(`/conferences/${id}/deadlines`).then((r) => r.data),
  setDeadline: (id, data) => client.post(`/conferences/${id}/deadlines`, data).then((r) => r.data),

  listTracks: (id) => client.get(`/conferences/${id}/tracks`).then((r) => r.data),
  // ADDED: getTracks alias so components calling getTracks work seamlessly
  getTracks: (id) => client.get(`/conferences/${id}/tracks`).then((r) => r.data),
  createTrack: (id, data) => client.post(`/conferences/${id}/tracks`, data).then((r) => r.data),

  getCfp: (id) => client.get(`/conferences/${id}/cfp`).then((r) => r.data),
  upsertCfp: (id, content) => client.put(`/conferences/${id}/cfp`, { content }).then((r) => r.data),

  listPublicCfps: () => client.get('/conferences/public/cfps').then((r) => r.data),
};