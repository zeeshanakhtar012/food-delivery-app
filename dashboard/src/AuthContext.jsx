import { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      console.log('Fetching profile with token:', token);
      axios.get('http://localhost:5001/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          console.log('Profile fetched:', res.data);
          setUser(res.data.user);
        })
        .catch(error => {
          console.error('Profile fetch error:', error.message);
          setToken(null);
          localStorage.removeItem('token');
          navigate('/login');
        });
    }
  }, [token, navigate]);

  const login = async (email, password) => {
    try {
      console.log('Logging in with:', { email, password });
      const res = await axios.post('http://localhost:5001/api/users/login', { email, password });
      console.log('Login response:', res.data);
      if (res.data.user.isAdmin) {
        setToken(res.data.token);
        setUser(res.data.user);
        localStorage.setItem('token', res.data.token);
        navigate('/');
      } else {
        throw new Error('Access denied: Admin only');
      }
    } catch (error) {
      console.error('Login error:', error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;