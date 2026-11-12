import client from './client';

export const committeeApi = {
  list: (conferenceId) => client.get(`/conferences/${conferenceId}/committee`).then((r) => r.data),
  remove: (conferenceId, assignmentId) =>
    client.delete(`/conferences/${conferenceId}/committee/${assignmentId}`),
};