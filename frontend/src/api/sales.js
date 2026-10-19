import api from './axios';

export const salesApi = {
  getAll: () => api.get('/sales'),
  getMonthly: () => api.get('/sales/monthly'),
  getByCategory: () => api.get('/sales/category'),
  getByProduct: () => api.get('/sales/products'),
};
