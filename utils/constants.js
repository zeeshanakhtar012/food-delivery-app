/**
 * Application constants
 */

module.exports = {
  // Order statuses
  ORDER_STATUS: {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    PREPARING: 'preparing',
    PICKED_UP: 'picked_up',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled'
  },

  // Payment methods
  PAYMENT_METHOD: {
    CASH: 'cash',
    CARD: 'card',
    WALLET: 'wallet',
    STRIPE: 'stripe',
    PAYPAL: 'paypal'
  },

  // Payment statuses
  PAYMENT_STATUS: {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded'
  },

  // Order types
  ORDER_TYPE: {
    DELIVERY: 'delivery',
    PICKUP: 'pickup'
  },

  // Rider statuses
  RIDER_STATUS: {
    ONLINE: 'online',
    OFFLINE: 'offline',
    BUSY: 'busy'
  },

  // Coupon types
  COUPON_TYPE: {
    PERCENTAGE: 'percentage',
    FIXED_AMOUNT: 'fixed_amount',
    FREE_DELIVERY: 'free_delivery'
  },

  // Notification types
  NOTIFICATION_TYPE: {
    ORDER: 'order',
    PAYMENT: 'payment',
    PROMOTION: 'promotion',
    SYSTEM: 'system',
    CHAT: 'chat'
  },

  // User roles
  ROLE: {
    SUPER_ADMIN: 'super_admin',
    RESTAURANT_ADMIN: 'restaurant_admin',
    RIDER: 'rider',
    USER: 'user'
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
  },

  // File upload limits
  UPLOAD: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  }
};

