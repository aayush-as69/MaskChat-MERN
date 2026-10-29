import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

let csrfToken = null;
let csrfRequest = null;
const unsafeMethods = new Set(['post', 'put', 'patch', 'delete']);

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  if (!csrfRequest) {
    csrfRequest = api.get('/api/v1/csrf')
      .then(({ data }) => {
        csrfToken = data.csrfToken;
        return csrfToken;
      })
      .finally(() => { csrfRequest = null; });
  }
  return csrfRequest;
}

api.interceptors.request.use(async (request) => {
  if (unsafeMethods.has(String(request.method || 'get').toLowerCase())) {
    request.headers['X-CSRF-Token'] = await getCsrfToken();
  }
  return request;
});

api.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 403 && /CSRF/i.test(error.response?.data?.error || '')) {
    csrfToken = null;
  }
  const message = error.response?.data?.error || error.message || 'Something went wrong';
  return Promise.reject(new Error(message));
});
