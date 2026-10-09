import axios from 'axios';

// Honor the same configurable API origin as the storefront client so the admin
// panel works when the backend is served from a different origin than the SPA.
// VITE_API_URL should point at the API root (e.g. https://api.example.com/api);
// defaults to the same-origin '/api' handled by the dev proxy / rewrites.
const API_ROOT = import.meta.env.VITE_API_URL || '/api';
const ADMIN_BASE = `${API_ROOT}/admin`;

const adminApi = axios.create({
  baseURL: ADMIN_BASE,
  withCredentials: true, // Send and receive HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  timeout: 10000,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Response interceptor to handle transparent token refresh
adminApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 TOKEN_EXPIRED and we haven't already retried this request
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => adminApi(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(`${ADMIN_BASE}/auth/refresh`, {}, { withCredentials: true });
        processQueue(null);
        return adminApi(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr);
        window.dispatchEvent(new CustomEvent('admin:session-expired'));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default adminApi;
