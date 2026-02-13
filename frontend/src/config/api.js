export const API_CONFIG = {
    isProduction: true,
    get baseURL() {
        return this.isProduction
            ? 'https://api-food-delivery-app.onrender.com' // TODO: Update with actual production URL
            : 'http://localhost:5001';
    }
};
