import axios from 'axios';

const DATA_SERVICE_BASE_URL = process.env.DATA_SERVICE_BASE_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: DATA_SERVICE_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
