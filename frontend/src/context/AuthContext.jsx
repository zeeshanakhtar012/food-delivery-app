import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for stored user data on load
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (storedUser && token) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) {
                console.error('Failed to parse stored user data', error);
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }
        }
        setLoading(false);
    }, []);

    const login = async (role, credentials) => {
        // Determine the login endpoint based on role
        // Super Admin: /api/superadmin/login
        // Restaurant Admin: /api/admin/login
        let endpoint = '';
        if (role === 'super_admin') {
            endpoint = '/api/superadmin/login';
        } else if (role === 'restaurant_admin') {
            endpoint = '/api/admin/login';
        } else {
            throw new Error('Invalid role');
        }

        try {
            console.log(`[AuthContext] Attempting login for role: ${role} at ${endpoint}`);
            const response = await api.post(endpoint, credentials);
            console.log('[AuthContext] Raw Login Response:', response);
            console.log('[AuthContext] Response Data:', response.data);

            // Handle different response structures
            let token, admin, restaurant;

            if (response.data.data && response.data.data.token) {
                // Structure from successResponse helper (likely Restaurant Admin)
                console.log('[AuthContext] Detected successResponse structure');
                token = response.data.data.token;
                admin = response.data.data.admin;
                restaurant = response.data.data.restaurant;
            } else if (response.data.token) {
                // Direct JSON structure (likely Super Admin)
                console.log('[AuthContext] Detected direct JSON structure');
                token = response.data.token;
                admin = response.data.admin;
                restaurant = response.data.restaurant;
            } else {
                console.error('[AuthContext] Unknown response structure', response.data);
                throw new Error('Invalid server response structure');
            }

            if (!token) {
                console.error('[AuthContext] Token is missing from response');
                throw new Error('Authentication failed: No token received');
            }

            // Normalize user object
            const userData = {
                ...admin,
                role: role,
                _token: token
            };

            if (restaurant) {
                userData.restaurant = restaurant;
            }

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            return userData;
        } catch (error) {
            console.error('Login failed', error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        window.location.assign('/login');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
