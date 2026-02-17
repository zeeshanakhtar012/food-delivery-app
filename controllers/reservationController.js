const { successResponse, errorResponse } = require('../helpers/response');
const Reservation = require('../models/PostgreSQL/Reservation');
const { logCreate, logUpdate, logDelete } = require('../services/auditService');

exports.createReservation = async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurant_id;
        const { customer_name, customer_phone, reservation_time, guest_count, table_id, notes } = req.body;

        if (!customer_name || !customer_phone || !reservation_time) {
            return errorResponse(res, 'Name, phone, and time are required', 400);
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
        return successResponse(res, reservation, 'Reservation created', 201);
    } catch (error) {
        next(error);
    }
};

exports.getReservations = async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurant_id;
        const { date, status } = req.query;

        const reservations = await Reservation.findAll(restaurantId, { date, status });
        return successResponse(res, reservations, 'Reservations retrieved');
    } catch (error) {
        next(error);
    }
};

exports.updateReservation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const restaurantId = req.user.restaurant_id;
        const updates = req.body;

        const existing = await Reservation.findById(id);
        if (!existing || existing.restaurant_id !== restaurantId) {
            return errorResponse(res, 'Reservation not found', 404);
        }

        const updated = await Reservation.update(id, updates);

        await logUpdate(req.user.id, 'restaurant_admin', 'RESERVATION', id, existing, updated, req);
        return successResponse(res, updated, 'Reservation updated');
    } catch (error) {
        next(error);
    }
};

exports.deleteReservation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const restaurantId = req.user.restaurant_id;

        const existing = await Reservation.findById(id);
        if (!existing || existing.restaurant_id !== restaurantId) {
            return errorResponse(res, 'Reservation not found', 404);
        }

        await Reservation.delete(id);
        await logDelete(req.user.id, 'restaurant_admin', 'RESERVATION', id, existing, req);
        return successResponse(res, null, 'Reservation deleted');
    } catch (error) {
        next(error);
    }
};
