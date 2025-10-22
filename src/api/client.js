import axios from "axios";
import { auth } from "../auth/firebase";

// Create a configured axios instance
const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:8000",
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
  // Set to true only if your backend uses cookies/sessions and CORS is configured for credentials
  withCredentials: false,
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
