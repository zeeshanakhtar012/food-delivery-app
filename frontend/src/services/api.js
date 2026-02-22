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

// Restaurant Admin Endpoints
export const restaurantAdmin = {
    // Food
    createFood: (data) => api.post('/api/admin/foods', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    getAllFoods: () => api.get('/api/admin/foods'),
    updateFood: (id, data) => api.put(`/api/admin/foods/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    deleteFood: (id) => api.delete(`/api/admin/foods/${id}`),

    // Orders
    getAllOrders: () => api.get('/api/admin/orders'),
    updateOrderStatus: (id, status, riderId = null) => api.put(`/api/admin/orders/${id}/status`, { status, rider_id: riderId }),
    assignRider: (id, riderId) => api.put(`/api/admin/orders/${id}/status`, { status: 'picked_up', rider_id: riderId }),

    createOrder: (data) => api.post('/api/admin/orders', data),
    updateOrderItems: (id, items) => api.put(`/api/admin/orders/${id}/items`, { items }),

    // Riders
    createRider: (data) => api.post('/api/admin/riders', data),
    getAllRiders: () => api.get('/api/admin/riders'),
    updateRider: (id, data) => api.put(`/api/admin/riders/${id}`, data),
    deleteRider: (id) => api.delete(`/api/admin/riders/${id}`),
    getRiderPerformance: (params) => api.get('/api/admin/riders/performance', { params }),
    blockRider: (id) => api.put(`/api/admin/riders/${id}/block`),
    unblockRider: (id) => api.put(`/api/admin/riders/${id}/unblock`),

    // Staff
    createStaff: (data) => api.post('/api/admin/staff', data),
    getStaff: () => api.get('/api/admin/staff'),
    updateStaff: (id, data) => api.put(`/api/admin/staff/${id}`, data),
    deleteStaff: (id) => api.delete(`/api/admin/staff/${id}`),

    // Tables
    createTable: (data) => api.post('/api/admin/tables', data),
    getAllTables: () => api.get('/api/admin/tables'),
    updateTable: (id, data) => api.put(`/api/admin/tables/${id}`, data),
    deleteTable: (id) => api.delete(`/api/admin/tables/${id}`),
    getTableActiveOrder: (id) => api.get(`/api/admin/tables/${id}/active-order`),

    // Analytics & Reports
    getAnalytics: () => api.get('/api/admin/analytics'),
    getSalesReport: (params) => api.get('/api/admin/reports/sales', { params }),
    getIncomeReport: (params) => api.get('/api/admin/reports/income', { params }),
    getTopProducts: (params) => api.get('/api/admin/reports/top-products', { params }),
    getLowStockItems: (params) => api.get('/api/admin/reports/low-stock', { params }),
    getProductsSummary: () => api.get('/api/admin/reports/products-summary'),
    getCategoryPerformance: () => api.get('/api/admin/reports/category-performance'),
    getIncomeSummary: (params) => api.get('/api/admin/reports/income-summary', { params }),
    getIncomeTrends: (params) => api.get('/api/admin/reports/income-trends', { params }),
    exportReport: (params) => api.get('/api/admin/reports/export', { params, responseType: 'blob' }),

    // Categories
    getCategories: () => api.get('/api/admin/categories'),
    createCategory: (data) => api.post('/api/admin/categories', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    updateCategory: (id, data) => api.put(`/api/admin/categories/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    deleteCategory: (id) => api.delete(`/api/admin/categories/${id}`),

    // Addons
    createAddon: (data) => api.post('/api/admin/addons', data),
    getFoodAddons: (foodId) => api.get(`/api/admin/addons/food/${foodId}`),
    updateAddon: (id, data) => api.put(`/api/admin/addons/${id}`, data),
    deleteAddon: (id) => api.delete(`/api/admin/addons/${id}`),

    // Reservations
    createReservation: (data) => api.post('/api/admin/reservations', data),
    getReservations: (params) => api.get('/api/admin/reservations', { params }),
    updateReservation: (id, data) => api.put(`/api/admin/reservations/${id}`, data),
    deleteReservation: (id) => api.delete(`/api/admin/reservations/${id}`),

    // Settings
    getProfile: () => api.get('/api/admin/profile'),
    updateProfile: (data) => api.put('/api/admin/profile', data),
    getRestaurant: () => api.get('/api/admin/restaurant'),

    // Coupons
    getCoupons: () => api.get('/api/coupons'),
    createCoupon: (data) => api.post('/api/coupons', data),
    deleteCoupon: (id) => api.delete(`/api/coupons/${id}`),
};

export const superAdmin = {
    // Restaurants
    createRestaurant: (data) => api.post('/api/superadmin/restaurants', data),
    getAllRestaurants: () => api.get('/api/superadmin/restaurants'),
    getRestaurantDetails: (id) => api.get(`/api/superadmin/restaurants/${id}/details`),
    getRestaurantAnalytics: (id) => api.get(`/api/superadmin/restaurants/${id}/analytics`),
    toggleRestaurantFreeze: (id) => api.put(`/api/superadmin/restaurants/${id}/freeze`),
    deleteRestaurant: (id) => api.delete(`/api/superadmin/restaurants/${id}`),

    // Analytics
    getPlatformAnalytics: () => api.get('/api/superadmin/analytics'),
};

// User Endpoints
export const user = {
    getRestaurantDetails: (id) => api.get(`/api/users/restaurants/${id}`),
};

export default api;
