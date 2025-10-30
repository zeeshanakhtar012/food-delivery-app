// src/contexts/AuthContext.jsx
import { createContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// NAMED EXPORT — REQUIRED for `import { AuthContext }`
export const AuthContext = createContext();

// Optional: keep default export for backward compatibility
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);          // full restaurantAdmin object
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [expiresAt, setExpiresAt] = useState(() => localStorage.getItem('expiresAt') || null);
  const navigate = useNavigate();

  // -----------------------------------------------------------------
  // Axios interceptor – adds Bearer token to every request
  // -----------------------------------------------------------------
  useEffect(() => {
    const requestIntercept = axios.interceptors.request.use(
      (config) => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (err) => Promise.reject(err)
    );

    const responseIntercept = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401) {
          // token invalid / expired → force logout
          logout();
        }
        return Promise.reject(err);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestIntercept);
      axios.interceptors.response.eject(responseIntercept);
    };
  }, [token]);

  // -----------------------------------------------------------------
  // Auto-logout when token expires
  // -----------------------------------------------------------------
  useEffect(() => {
    if (!expiresAt) return;

    const now = Date.now();
    const timeout = new Date(expiresAt).getTime() - now;

    if (timeout <= 0) {
      logout();
      return;
    }

    const timer = setTimeout(() => logout(), timeout);
    return () => clearTimeout(timer);
  }, [expiresAt]);

  // -----------------------------------------------------------------
  // Load profile when token exists (on page reload / first mount)
  // -----------------------------------------------------------------
  const loadProfile = useCallback(async () => {
    if (!token) return;

    try {
      // The backend already returns the full restaurantAdmin on sign-in,
      // but we keep a generic “/profile” endpoint for completeness.
      const res = await axios.get('http://localhost:5001/api/users/profile');
      setUser(res.data.user);
    } catch (err) {
      console.error('Profile load failed', err);
      logout();
    }
  }, [token]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // -----------------------------------------------------------------
  // LOGIN – restaurant admin
  // -----------------------------------------------------------------
  const login = async (email, password) => {
    try {
      const res = await axios.post('http://localhost:5001/api/restaurant-owner/signin', {
        email,
        password,
      });

      const { token, restaurantAdmin, expiresIn } = res.data;

      // restaurantAdmin is the full object returned by signinRestaurantAdmin()
      setToken(token);
      setUser(restaurantAdmin);
      const exp = Date.now() + expiresIn * 1000;
      setExpiresAt(exp);

      localStorage.setItem('token', token);
      localStorage.setItem('expiresAt', exp);

      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed';
      throw new Error(msg);
    }
  };

  // -----------------------------------------------------------------
  // LOGOUT
  // -----------------------------------------------------------------
  const logout = () => {
    setToken(null);
    setUser(null);
    setExpiresAt(null);
    localStorage.removeItem('token');
    localStorage.removeItem('expiresAt');
    navigate('/login');
  };

  // -----------------------------------------------------------------
  // Helper: ready-to-use axios instance (already has token)
  // -----------------------------------------------------------------
  const api = axios; // same instance – interceptors are already attached

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        api,               // <-- import { api } from '@/contexts/AuthContext'
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;