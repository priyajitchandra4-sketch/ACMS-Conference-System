import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
});

// Attach the JWT and preserve request-specific content types.
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');

    if (token) {
      if (typeof config.headers?.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    const headers = config.headers;
    const getHeader = (name) => {
      if (typeof headers?.get === 'function') {
        return headers.get(name);
      }
      return headers?.[name] ?? headers?.[name.toLowerCase()];
    };

    // Let the browser set the multipart boundary.
    if (config.data instanceof FormData) {
      if (typeof headers?.delete === 'function') {
        headers.delete('Content-Type');
      } else if (headers) {
        delete headers['Content-Type'];
        delete headers['content-type'];
      }
    } else if (config.data !== undefined) {
      // Keep an explicitly requested type, e.g. login's URL-encoded form.
      // Use JSON as the default for ordinary API requests.
      const contentType = getHeader('Content-Type');

      if (!contentType) {
        if (typeof headers?.set === 'function') {
          headers.set('Content-Type', 'application/json');
        } else {
          headers['Content-Type'] = 'application/json';
        }
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Clear expired or invalid tokens, except for failed login attempts.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isLoginCall = url.includes('/auth/login');

    if (status === 401 && !isLoginCall) {
      localStorage.removeItem('access_token');

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default client;