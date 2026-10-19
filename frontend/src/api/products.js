import api from './axios';

export const productApi = {
  getAll: () => api.get('/products'),
  create: (data) => api.post('/products', data),
  update: (product_id, data) => api.put(`/products/${product_id}`, data),
  delete: (product_id) => api.delete(`/products/${product_id}`),
};
