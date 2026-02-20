const Reservation = require('../models/PostgreSQL/Reservation');
const { successResponse, errorResponse } = require('../helpers/response');
const { logCreate, logUpdate, logDelete } = require('../services/auditService');

// Create Reservation
exports.createReservation = async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurant_id;
        const { customer_name, customer_phone, reservation_time, guest_count, table_id, notes } = req.body;

        if (!customer_name || !customer_phone || !reservation_time) {
            return errorResponse(res, 'Name, phone and time are required', 400);
        }

        const reservation = await Reservation.create({
            restaurant_id: restaurantId,
            customer_name,
            customer_phone,
            reservation_time,
            guest_count,
            table_id,
            notes
        });

        await logCreate(req.user.id, 'restaurant_admin', 'RESERVATION', reservation.id, reservation, req);

        // Notify via Socket
        const io = req.app.get('io');
        io.to(`restaurant:${restaurantId}`).emit('newReservation', reservation);

        return successResponse(res, reservation, 'Reservation created', 201);
    } catch (error) {
        next(error);
    }
};

// Get Reservations
exports.getReservations = async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurant_id;
        const { date, status } = req.query;

        const reservations = await Reservation.findByRestaurantId(restaurantId, date, status);
        return successResponse(res, reservations, 'Reservations retrieved');
    } catch (error) {
        next(error);
    }
};

// Update Reservation
exports.updateReservation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const restaurantId = req.user.restaurant_id;
        const updates = req.body;

        const reservation = await Reservation.findById(id);
        if (!reservation || reservation.restaurant_id !== restaurantId) {
            return errorResponse(res, 'Reservation not found', 404);
        }

        const updated = await Reservation.update(id, updates);

        await logUpdate(req.user.id, 'restaurant_admin', 'RESERVATION', id, reservation, updated, req);

        return successResponse(res, updated, 'Reservation updated');
    } catch (error) {
        next(error);
    }
};

// Delete Reservation
exports.deleteReservation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const restaurantId = req.user.restaurant_id;

        const reservation = await Reservation.findById(id);
        if (!reservation || reservation.restaurant_id !== restaurantId) {
            return errorResponse(res, 'Reservation not found', 404);
        }

        await Reservation.delete(id);
        await logDelete(req.user.id, 'restaurant_admin', 'RESERVATION', id, reservation, req);

        return successResponse(res, null, 'Reservation deleted');
    } catch (error) {
        next(error);
    }
};
