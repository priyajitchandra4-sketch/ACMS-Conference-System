import client from './client';

export const reviewsApi = {
  mine: async () => (await client.get('/reviews/mine')).data,
  getMine: async (paperId) => (await client.get(`/papers/${paperId}/review`)).data,
  save: async (paperId, payload) => (await client.put(`/papers/${paperId}/review`, payload)).data,
  getForManager: async (paperId) => (await client.get(`/papers/${paperId}/reviews`)).data,
  getProgress: async (trackId) => (await client.get(`/tracks/${trackId}/review-progress`)).data,
  getDiscussion: async (paperId) => (await client.get(`/papers/${paperId}/discussion`)).data,
  postDiscussion: async (paperId, body) => (await client.post(`/papers/${paperId}/discussion`, { body })).data,
};
