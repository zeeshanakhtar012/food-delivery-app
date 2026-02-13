export const API_CONFIG = {
    isProduction: false,
    get baseURL() {
        return this.isProduction
            ? 'https://api.your-production-url.com' // TODO: Update with actual production URL
            : 'http://localhost:5001';
    }
};
