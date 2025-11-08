import axios from "axios";
import { auth } from "../auth/firebase";

// Create a configured axios instance
// Note: Backend registers routes under `/api/...` by default; include it here.
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
  // Set to true only if your backend uses cookies/sessions and CORS is configured for credentials
  withCredentials: false,
});

console.log('[API] baseURL from axios:', api.defaults.baseURL);

// TEMP: log final URL for every request
api.interceptors.request.use((config) => {
  const full = `${(config.baseURL ?? '').replace(/\/+$/, '')}/${String(config.url ?? '').replace(/^\/+/, '')}`;
  console.log('[API] →', config.method?.toUpperCase(), full);
  return config;
});

// Attach Firebase ID token if user is signed in
api.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    } else if (config.headers && "Authorization" in config.headers) {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Optional basic response/error handling
api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

export default api;
