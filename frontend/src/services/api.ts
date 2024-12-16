import axios, { AxiosRequestConfig } from 'axios';
import { authService } from './auth';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

// Add request interceptor to include auth token
api.interceptors.request.use((config: AxiosRequestConfig) => {
  const token = authService.getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      authService.logout();
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default api; 