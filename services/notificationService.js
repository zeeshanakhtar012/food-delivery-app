/**
 * Notification service (Email, SMS, Push notifications)
 */

const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Email transporter
const emailTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Twilio client (for SMS)
const twilioClient = process.env.TWILIO_ACCOUNT_SID 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

/**
 * Send email notification
 */
const sendEmail = async (to, subject, html, text = null) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
    };

    const info = await emailTransporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
};

/**
 * Send SMS notification
 */
const sendSMS = async (to, message) => {
  try {
    if (!twilioClient) {
      console.warn('Twilio not configured. SMS not sent.');
      return { success: false, error: 'SMS service not configured' };
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to
    });

    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('SMS send error:', error);
    throw error;
  }
};

/**
 * Create notification in database
 */
const createNotification = async (notificationData) => {
  const { query } = require('../config/db');
  const { v4: uuidv4 } = require('uuid');

  const {
    user_id,
    rider_id,
    restaurant_id,
    order_id,
    type,
    title,
    message,
    data = null
  } = notificationData;

  const result = await query(
    `INSERT INTO notifications (id, user_id, rider_id, restaurant_id, order_id, type, title, message, data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [uuidv4(), user_id, rider_id, restaurant_id, order_id, type, title, message, data ? JSON.stringify(data) : null]
  );

  return result.rows[0];
};

/**
 * Send order notification
 */
const sendOrderNotification = async (order, type = 'order') => {
  // Notification to user
  if (order.user_id) {
    await createNotification({
      user_id: order.user_id,
      order_id: order.id,
      type,
      title: `Order ${order.order_number}`,
      message: `Your order has been ${order.status}`,
      data: { order_id: order.id, status: order.status }
    });
  }

  // Notification to restaurant admin
  if (order.restaurant_id) {
    await createNotification({
      restaurant_id: order.restaurant_id,
      order_id: order.id,
      type,
      title: `New Order ${order.order_number}`,
      message: `New order received`,
      data: { order_id: order.id }
    });
  }

  // Notification to rider
  if (order.rider_id && order.status === 'picked_up') {
    await createNotification({
      rider_id: order.rider_id,
      order_id: order.id,
      type,
      title: `Order Assigned`,
      message: `You have been assigned order ${order.order_number}`,
      data: { order_id: order.id }
    });
  }
};

module.exports = {
  sendEmail,
  sendSMS,
  createNotification,
  sendOrderNotification
};

