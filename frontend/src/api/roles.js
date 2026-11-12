import client from './client';

export const rolesApi = {
  // Every role the logged-in user holds, with conference and track names
  mine: () => client.get('/roles/mine').then((r) => r.data),
};