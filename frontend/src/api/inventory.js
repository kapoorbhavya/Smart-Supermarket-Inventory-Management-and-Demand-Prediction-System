import api from './axios';

export const inventoryApi = {
  getAll: () => api.get('/inventory'),
  create: (data) => api.post('/inventory', data),
  update: (batch_id, data) => api.put(`/inventory/${batch_id}`, data),
  delete: (batch_id) => api.delete(`/inventory/${batch_id}`),
};
