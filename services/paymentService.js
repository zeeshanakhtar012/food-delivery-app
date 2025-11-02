/**
 * Payment service (Stripe, PayPal integration)
 */

const { query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Lazy initialization of Stripe client
let stripe = null;
const getStripeClient = () => {
  if (!stripe) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured. Please set it in your .env file.');
    }
    stripe = require('stripe')(stripeKey);
  }
  return stripe;
};

/**
 * Create Stripe payment intent
 */
const createStripePaymentIntent = async (amount, currency = 'usd', metadata = {}) => {
  try {
    const stripeClient = getStripeClient();
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true
      }
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    };
  } catch (error) {
    console.error('Stripe payment intent error:', error);
    throw error;
  }
};

/**
 * Confirm Stripe payment
 */
const confirmStripePayment = async (paymentIntentId) => {
  try {
    const stripeClient = getStripeClient();
    const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Stripe payment confirmation error:', error);
    throw error;
  }
};

/**
 * Create payment record in database
 */
const createPaymentRecord = async (paymentData) => {
  const {
    order_id,
    user_id,
    amount,
    payment_method,
    payment_status = 'pending',
    transaction_id = null,
    payment_gateway_response = null
  } = paymentData;

  const result = await query(
    `INSERT INTO payments (id, order_id, user_id, amount, payment_method, payment_status, transaction_id, payment_gateway_response)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [uuidv4(), order_id, user_id, amount, payment_method, payment_status, transaction_id, payment_gateway_response ? JSON.stringify(payment_gateway_response) : null]
  );

  return result.rows[0];
};

/**
 * Update payment status
 */
const updatePaymentStatus = async (paymentId, status, transactionId = null) => {
  const result = await query(
    `UPDATE payments 
     SET payment_status = $1, transaction_id = COALESCE($2, transaction_id), updated_at = CURRENT_TIMESTAMP
     WHERE id = $3
     RETURNING *`,
    [status, transactionId, paymentId]
  );

  return result.rows[0];
};

/**
 * Process payment
 */
const processPayment = async (orderId, paymentMethod, amount, userId) => {
  try {
    let transactionId = null;
    let gatewayResponse = null;

    // Handle different payment methods
    if (paymentMethod === 'stripe') {
      const paymentIntent = await createStripePaymentIntent(amount, 'usd', {
        order_id: orderId,
        user_id: userId
      });
      transactionId = paymentIntent.paymentIntentId;
      gatewayResponse = { clientSecret: paymentIntent.clientSecret };
    } else if (paymentMethod === 'cash' || paymentMethod === 'wallet') {
      // Cash on delivery or wallet payment - no gateway needed
      transactionId = `CASH-${Date.now()}`;
    }

    // Create payment record
    const payment = await createPaymentRecord({
      order_id: orderId,
      user_id: userId,
      amount,
      payment_method: paymentMethod,
      payment_status: paymentMethod === 'cash' ? 'pending' : 'completed',
      transaction_id: transactionId,
      payment_gateway_response: gatewayResponse
    });

    return payment;
  } catch (error) {
    console.error('Payment processing error:', error);
    throw error;
  }
};

module.exports = {
  createStripePaymentIntent,
  confirmStripePayment,
  createPaymentRecord,
  updatePaymentStatus,
  processPayment
};

