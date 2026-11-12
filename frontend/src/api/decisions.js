import client from './client';

const optionalGet = async (path) => {
  try { return (await client.get(path)).data; }
  catch (error) { if (error?.response?.status === 404) return null; throw error; }
};

export const decisionsApi = {
  myDecisions: async () => (await client.get('/author/decisions')).data,
  chairQueue: async (params = {}) => (await client.get('/chair/decisions/queue', { params })).data,
  getPaperDecision: async (paperId) => (await client.get(`/papers/${paperId}/decision`)).data,
  decide: async (paperId, payload) => (await client.post(`/papers/${paperId}/decision`, payload)).data,
  getRebuttal: async (paperId) => optionalGet(`/papers/${paperId}/rebuttal`),
  submitRebuttal: async (paperId, rebuttal) => (await client.post(`/papers/${paperId}/rebuttal`, { rebuttal })).data,
  getCameraReady: async (paperId) => optionalGet(`/papers/${paperId}/camera-ready`),
  submitCameraReady: async (paperId, formData) => (await client.post(`/papers/${paperId}/camera-ready`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data,
};
