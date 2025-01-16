import axios, { InternalAxiosRequestConfig } from 'axios';
import { authService } from './auth';

const api = axios.create({
  //baseURL: 'http://localhost:8000',
  baseURL: 'https://facilitador-api.matrixcargo.com.br',
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = authService.getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

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
