import api from './axios';

export const expiryApi = {
  getExpiryRisk: () => api.get('/expiry-risk'),
};
