import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (window.location.hostname === 'product-conflicts-frontend.onrender.com' 
    ? 'https://product-conflicts-backend.onrender.com/api' 
    : 'http://localhost:5000/api');

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
  uploadExcel: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default api;
