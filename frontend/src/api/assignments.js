import client from './client';

export const assignmentsApi = {
  // ---- Reviewer ----
  getMine: async () => {
    const response = await client.get('/assignments/mine');
    return response.data;
  },
  accept: async (assignmentId) => {
    const response = await client.post(`/assignments/${assignmentId}/accept`);
    return response.data;
  },
  decline: async (assignmentId) => {
    const response = await client.post(`/assignments/${assignmentId}/decline`);
    return response.data;
  },

  // ---- Meta-Reviewer ----
  getMetaPapers: async () => {
    const response = await client.get('/meta/papers');
    return response.data;
  },

  // ---- Meta-Reviewer / Track Chair ----
  getCandidates: async (paperId) => {
    const response = await client.get(`/papers/${paperId}/candidates`);
    return response.data;
  },
  getPaperAssignments: async (paperId) => {
    const response = await client.get(`/papers/${paperId}/assignments`);
    return response.data;
  },
  assignReviewer: async (paperId, reviewerId, dueAt = null) => {
    const response = await client.post(`/papers/${paperId}/assignments`, {
      reviewer_id: reviewerId,
      due_at: dueAt,
    });
    return response.data;
  },
  cancelAssignment: async (assignmentId) => {
    await client.delete(`/assignments/${assignmentId}`);
  },

  // ---- Track Chair ----
  assignMeta: async (paperId, metaReviewerId) => {
    const response = await client.post(`/papers/${paperId}/meta-assignments`, {
      meta_reviewer_id: metaReviewerId,
    });
    return response.data;
  },
  getMyTracks: async () => {
    const response = await client.get('/tracks/mine');
    return response.data;
  },
  getTrackOverview: async (trackId) => {
    const response = await client.get(`/tracks/${trackId}/assignment-overview`);
    return response.data;
  },
  getTrackMembers: async (trackId, role) => {
    const response = await client.get(`/tracks/${trackId}/members`, {
      params: { role },
    });
    return response.data;
  },
};
