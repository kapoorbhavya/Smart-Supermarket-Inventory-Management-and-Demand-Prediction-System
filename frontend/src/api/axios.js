import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      error.userMessage = 'Forecast is taking longer than expected. Please try again.';
    } else if (!error.response) {
      error.userMessage = 'Unable to connect to the backend. Please check that the backend is running.';
    } else {
      error.userMessage = error.response.data?.message || `Server error: ${error.response.status}`;
    }
    return Promise.reject(error);
  }
);

export default api;
