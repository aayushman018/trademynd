import axios from 'axios';

// In production (Vercel), we want to use relative paths so requests go to the same domain.
// The vercel.json rewrites will handle routing /api/... to the backend function.
// In development, we use localhost:8000.
let API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  if (process.env.NODE_ENV === 'production') {
    API_URL = ''; // Relative path
  } else {
    API_URL = 'http://localhost:8000';
  }
}

// Render provides the host without protocol (e.g. "service.onrender.com"),
// so we need to ensure it has https:// if not present (and not localhost and not empty).
if (API_URL && !API_URL.startsWith('http') && !API_URL.startsWith('/')) {
  API_URL = `https://${API_URL}`;
}

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
