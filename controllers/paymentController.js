const Payment = require('../models/PostgreSQL/Payment');
const { successResponse, errorResponse, paginatedResponse } = require('../helpers/response');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');
const paymentService = require('../services/paymentService');
const { logAction } = require('../services/auditService');

// Create payment
exports.createPayment = async (req, res, next) => {
  try {
    const { order_id, amount, payment_method } = req.body;

    if (!order_id || !amount || !payment_method) {
      return errorResponse(res, 'Order ID, amount, and payment method are required', 400);
    }

    const Order = require('../models/PostgreSQL/Order');
    const order = await Order.findById(order_id);

    if (!order) {
      return errorResponse(res, 'Order not found', 404);
    }

    if (order.user_id !== req.user.id) {
      return errorResponse(res, 'Access denied', 403);
    }

    const payment = await paymentService.processPayment(order_id, payment_method, parseFloat(amount), req.user.id);

    await logAction(req.user.id, 'user', 'CREATE_PAYMENT', 'PAYMENT', payment.id, payment, req);

    return successResponse(res, payment, 'Payment created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// Create Stripe payment intent
exports.createStripePayment = async (req, res, next) => {
  try {
    const { order_id, amount } = req.body;

    if (!order_id || !amount) {
      return errorResponse(res, 'Order ID and amount are required', 400);
    }

    const Order = require('../models/PostgreSQL/Order');
    const order = await Order.findById(order_id);

    if (!order) {
      return errorResponse(res, 'Order not found', 404);
    }

    if (order.user_id !== req.user.id) {
      return errorResponse(res, 'Access denied', 403);
    }

    const paymentIntent = await paymentService.createStripePaymentIntent(
      parseFloat(amount),
      'usd',
      { order_id, user_id: req.user.id }
    );

    // Create payment record
    const payment = await paymentService.createPaymentRecord({
      order_id,
      user_id: req.user.id,
      amount: parseFloat(amount),
      payment_method: 'stripe',
      payment_status: 'pending',
      transaction_id: paymentIntent.paymentIntentId,
      payment_gateway_response: { clientSecret: paymentIntent.clientSecret }
    });

    return successResponse(res, {
      payment_id: payment.id,
      client_secret: paymentIntent.clientSecret,
      payment_intent_id: paymentIntent.paymentIntentId
    }, 'Stripe payment intent created', 201);
  } catch (error) {
    next(error);
  }
};

// Confirm payment
exports.confirmPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { payment_intent_id } = req.body;

    const payment = await Payment.findById(id);

    if (!payment) {
      return errorResponse(res, 'Payment not found', 404);
    }

    if (payment.user_id !== req.user.id) {
      return errorResponse(res, 'Access denied', 403);
    }

    let updatedPayment;

    if (payment.payment_method === 'stripe' && payment_intent_id) {
      const paymentIntent = await paymentService.confirmStripePayment(payment_intent_id);
      
      if (paymentIntent.status === 'succeeded') {
        updatedPayment = await paymentService.updatePaymentStatus(id, 'completed', payment_intent_id);

        // Update order payment status
        const Order = require('../models/PostgreSQL/Order');
        await Order.updateStatus(payment.order_id, 'accepted');

        await logAction(req.user.id, 'user', 'CONFIRM_PAYMENT', 'PAYMENT', id, updatedPayment, req);
      } else {
        await paymentService.updatePaymentStatus(id, 'failed');
        return errorResponse(res, 'Payment failed', 400);
      }
    } else {
      // For cash or wallet, mark as completed
      updatedPayment = await paymentService.updatePaymentStatus(id, 'completed');
    }

    return successResponse(res, updatedPayment, 'Payment confirmed successfully');
  } catch (error) {
    next(error);
  }
};

// Get payment by ID
exports.getPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findById(id);

    if (!payment) {
      return errorResponse(res, 'Payment not found', 404);
    }

    if (payment.user_id !== req.user.id) {
      return errorResponse(res, 'Access denied', 403);
    }

    return successResponse(res, payment, 'Payment retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get my payments
exports.getMyPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = getPaginationParams(req);
    const result = await Payment.findByUserId(req.user.id, page, limit);
    const pagination = getPaginationMeta(page, limit, result.total);

    return paginatedResponse(res, result.payments, pagination, 'Payments retrieved successfully');
  } catch (error) {
    next(error);
  }
};

