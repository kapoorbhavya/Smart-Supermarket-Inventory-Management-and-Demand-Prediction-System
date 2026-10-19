import api from './axios';

export const forecastApi = {
  getForecast: (days = 7) => api.get(`/forecast?days=${days}`),
};
