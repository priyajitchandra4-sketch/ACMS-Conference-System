import client from './client';

export const externalApi = {
  assignments: async () => (await client.get('/external/assignments')).data,
  accept: async (assignmentId) => (await client.post(`/external/assignments/${assignmentId}/accept`)).data,
  decline: async (assignmentId) => (await client.post(`/external/assignments/${assignmentId}/decline`)).data,
  getReview: async (paperId) => (await client.get(`/external/papers/${paperId}/review`)).data,
  saveReview: async (paperId, payload) => (await client.put(`/external/papers/${paperId}/review`, payload)).data,
  managerList: async (params = {}) => (await client.get('/chair/external-assignments', { params })).data,
  invite: async (payload) => (await client.post('/chair/external-assignments', payload)).data,
  cancel: async (assignmentId) => (await client.delete(`/chair/external-assignments/${assignmentId}`)).data,
};
