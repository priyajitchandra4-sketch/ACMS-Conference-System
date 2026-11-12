import client from './client';

const optionalGet = async (path) => {
  try { return (await client.get(path)).data; }
  catch (error) { if (error?.response?.status === 404) return null; throw error; }
};

export const delegatesApi = {
  getMine: async () => optionalGet('/delegates/me/registration'),
  register: async (payload) => (await client.post('/delegates/registrations', payload)).data,
  updateMine: async (payload) => (await client.put('/delegates/me/registration', payload)).data,
  getPayment: async () => optionalGet('/delegates/me/payment'),
  createCheckout: async () => (await client.post('/delegates/payments/checkout')).data,
  listForChair: async (params = {}) => (await client.get('/chair/delegates', { params })).data,
  markPayment: async (registrationId, payload) => (await client.post(`/chair/delegates/${registrationId}/payment`, payload)).data,
};
