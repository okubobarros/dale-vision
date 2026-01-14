// src/services/api.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const getTokenFromStorage = (): string | null => {
  return localStorage.getItem('authToken');
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  withCredentials: true,
});

// DEBUG: Log todas as requisições
api.interceptors.request.use(
  (config) => {
    console.log('🔵 API Request:', {
      url: config.url,
      method: config.method,
      headers: config.headers,
      data: config.data,
    });
    
    const token = getTokenFromStorage();
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    } else {
      // Para login, não enviar Authorization header
      delete config.headers.Authorization;
    }
    
    return config;
  },
  (error) => {
    console.error('🔴 API Request Error:', error);
    return Promise.reject(error);
  }
);

// DEBUG: Log todas as respostas
api.interceptors.response.use(
  (response) => {
    console.log('🟢 API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error('🔴 API Response Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

export default api;