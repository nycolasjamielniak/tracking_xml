import axios from 'axios';
import { authService } from './auth'; // Ajuste o caminho para onde seu authService está

const api = axios.create({
  //baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000'
  baseURL: 'https://facilitador-api.matrixcargo.com.br'
});

// Adicionar o interceptor de request
api.interceptors.request.use((config) => {
  const token = authService.getAccessToken();
  if (token) {
    // Com Axios >= 1.x, headers é do tipo AxiosHeaders
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

export default api;