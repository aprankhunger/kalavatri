import axios from 'axios';

const adminApi = axios.create({
  baseURL: '/api/admin',
  withCredentials: true, // Send and receive HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  timeout: 10000,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
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
        await axios.post('/api/admin/auth/refresh', {}, { withCredentials: true });
        processQueue(null);
        return adminApi(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
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
