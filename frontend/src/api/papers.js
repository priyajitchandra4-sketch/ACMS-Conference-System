import client from './client';

export const papersApi = {
  createDraft: async (data) =>
    (await client.post('/papers/', data)).data,

  listMine: async () =>
    (await client.get('/papers/mine')).data,

  getById: async (paperId) =>
    (await client.get(`/papers/${paperId}`)).data,

  update: async (paperId, data) =>
    (await client.patch(`/papers/${paperId}`, data)).data,

  uploadManuscript: async (paperId, formData) =>
    (await client.post(`/papers/${paperId}/manuscript`, formData)).data,

  submit: async (paperId) =>
    (await client.post(`/papers/${paperId}/submit`)).data,

  getFinalManuscript: async (paperId) =>
    client.get(`/papers/${paperId}/manuscript/final`, {
      responseType: 'blob',
    }),
};