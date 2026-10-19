import api from './axios';

export const recommendationApi = {
  getAll: () => api.get('/recommendations'),
};
