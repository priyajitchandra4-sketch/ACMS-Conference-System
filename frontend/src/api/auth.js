import client from './client';

export const authApi = {
  // POST /api/v1/auth/login
  // Supports login(email, password) and login({ email, password }).
  login: async (emailOrCredentials, maybePassword) => {
    const email =
      typeof emailOrCredentials === 'string'
        ? emailOrCredentials
        : emailOrCredentials?.email ?? emailOrCredentials?.username;

    const password =
      typeof emailOrCredentials === 'string'
        ? maybePassword
        : emailOrCredentials?.password;

    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    const form = new URLSearchParams();
    form.set('username', email);
    form.set('password', password);

    const response = await client.post('/auth/login', form.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      // Keep the URL-encoded body as-is; don't let the client turn it into JSON.
      transformRequest: [(data) => data],
    });

    return response.data;
  },

  // POST /api/v1/auth/register
  register: async (userData) => {
    const response = await client.post('/auth/register', userData);
    return response.data;
  },

  // GET /api/v1/auth/me
  getCurrentUser: async () => {
    const response = await client.get('/auth/me');
    return response.data;
  },
};