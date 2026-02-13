import axios from 'axios';
import { API_CONFIG } from '../config/api';

const api = axios.create({
    baseURL: API_CONFIG.baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            if (token === 'undefined') {
                console.error('[API] Token in localStorage is string "undefined"!');
            }
            config.headers.Authorization = `Bearer ${token}`;
            console.log(`[API] Request: ${config.method.toUpperCase()} ${config.url}`, { headers: config.headers });
        } else {
            console.warn(`[API] No token found in localStorage for ${config.url}`);
        }
        return config;
    },
    (error) => {
        console.error('[API] Request Error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors (e.g., 401 Unauthorized)
api.interceptors.response.use(
    (response) => {
        console.log(`[API] Response Success: ${response.config.url}`, response.status);
        return response;
    },
    (error) => {
        console.error('[API] Response Error:', {
            url: error.config?.url,
            status: error.response?.status,
            data: error.response?.data
        });

        if (error.response && error.response.status === 401) {
            console.warn('[API] 401 Unauthorized detected. Clearing session and redirecting.');
            // Clear storage and redirect to login if token is invalid/expired
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
