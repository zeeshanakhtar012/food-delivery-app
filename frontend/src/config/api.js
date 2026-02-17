export const API_CONFIG = {
    isProduction: import.meta.env.PROD,
    get baseURL() {
        return import.meta.env.VITE_API_URL || (this.isProduction
            ? 'https://api-food-delivery-app.onrender.com'
            : 'http://localhost:5001');
    }
};
