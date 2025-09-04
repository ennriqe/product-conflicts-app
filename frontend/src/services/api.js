import axios from 'axios';

// Determine API URL based on environment
const getApiUrl = () => {
  // If environment variable is set, use it
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // If running on localhost, use local backend
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  
  // Otherwise, use production backend
  return 'https://product-conflicts-app.onrender.com/api';
};

const API_BASE_URL = getApiUrl();

// Debug logging
console.log('🌐 API Base URL:', API_BASE_URL);
console.log('📍 Current hostname:', window.location.hostname);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (password) => api.post('/login', { password }),
};

export const productsAPI = {
  getResponsiblePersons: () => api.get('/responsible-persons'),
  getProductsByPerson: (email) => api.get(`/products/${email}`),
  resolveConflict: (conflictId, selectedValue, comment, resolvedBy) =>
    api.post('/resolve-conflict', {
      conflictId,
      selectedValue,
      comment,
      resolvedBy,
    }),
};

export default api;
