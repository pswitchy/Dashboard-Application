// frontend/src/lib/api.ts
import axios from 'axios';
import { AuthContextType } from '@/contexts/AuthContext';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Crucial: Tells Axios to send cookies with requests
});

// --- REMOVE or COMMENT OUT the request interceptor ---
/*
api.interceptors.request.use(
  (config) => {
    // No longer needed - browser sends HttpOnly cookie automatically
    // if (typeof window !== 'undefined') {
    //   const token = localStorage.getItem('authToken');
    //   if (token) {
    //     config.headers.Authorization = `Bearer ${token}`;
    //   }
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
*/

// --- Response Interceptor (Still Useful for 401 handling) ---
export const setupInterceptors = (authContext: AuthContextType | null) => {
    api.interceptors.response.use(
        (response) => response,
        (error) => {
            // Keep this - if API returns 401 (e.g., cookie is invalid/expired)
            // call logout to clear client state
            if (error.response && error.response.status === 401) {
                console.log("API Interceptor: Unauthorized (401). Logging out client-side.");
                authContext?.logout(); // Use logout function from AuthContext
                // No need to redirect here, logout() handles it
            }
            return Promise.reject(error);
        }
    );
};

export default api;