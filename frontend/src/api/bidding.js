import client from './client';

export const biddingApi = {
  // GET /api/v1/bidding/papers — double-blind list (no author names)
  getPapers: async () => {
    const response = await client.get('/bidding/papers');
    return response.data;
  },

  // POST /api/v1/bidding/papers/:id/bid — value: 'want' | 'maybe' | 'no'
  placeBid: async (paperId, value) => {
    const response = await client.post(`/bidding/papers/${paperId}/bid`, { value });
    return response.data;
  },

  // POST /api/v1/bidding/papers/:id/conflict
  declareConflict: async (paperId, reason) => {
    const response = await client.post(`/bidding/papers/${paperId}/conflict`, { reason });
    return response.data;
  },

  // GET /api/v1/bidding/subject-areas
  getSubjectAreas: async () => {
    const response = await client.get('/bidding/subject-areas');
    return response.data;
  },

  // GET /api/v1/bidding/expertise
  getExpertise: async () => {
    const response = await client.get('/bidding/expertise');
    return response.data;
  },

  // PUT /api/v1/bidding/expertise — full list replacement
  setExpertise: async (items) => {
    const response = await client.put('/bidding/expertise', { items });
    return response.data;
  },
};
