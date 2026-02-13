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
            const response = await api.post(endpoint, credentials);
            const { token, admin, restaurant } = response.data;
            // Note: Backend response structure might vary slightly, adjusting based on common patterns.
            // SuperAdmin usually returns { token, admin: {...} }
            // RestaurantAdmin might return { token, admin: {...}, restaurant: {...} } or similar.

            // Normalize user object
            const userData = {
                ...admin,
                role: role, // Ensure role is explicitly set
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
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
