import client from './client';

export const reportsApi = {
  overview: async (params = {}) => (await client.get('/chair/reports/overview', { params })).data,
  auditLog: async (params = {}) => (await client.get('/chair/audit-log', { params })).data,
  securityOverview: async () => (await client.get('/chair/security/overview')).data,
  exportReport: async (params = {}) => {
    const response = await client.get('/chair/reports/export', { params, responseType: 'blob' });
    return response.data;
  },
};
