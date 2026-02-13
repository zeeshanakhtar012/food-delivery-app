const { successResponse, errorResponse } = require('../helpers/response');
const Table = require('../models/PostgreSQL/Table');
const Order = require('../models/PostgreSQL/Order');
const { logCreate, logUpdate, logDelete } = require('../services/auditService');

exports.createTable = async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurant_id;
        const { table_number, capacity, qr_code_url } = req.body;


        if (!table_number) {
            return errorResponse(res, 'Table number is required', 400);
        }

        // Check availability (unique constraint will handle it but good to check)
        // Actually letting DB handle unique constraint is fine or catch error

        try {
            const table = await Table.create({
                restaurant_id: restaurantId,
                table_number,
                capacity: parseInt(capacity) || 4,
                qr_code_url
            });

            await logCreate(req.user.id, 'restaurant_admin', 'TABLE', table.id, table, req);
            return successResponse(res, table, 'Table created', 201);
        } catch (error) {
            if (error.code === '23505') { // Unique violation
                return errorResponse(res, 'Table number already exists', 400);
            }
            throw error;
        }
    } catch (error) {
        next(error);
    }
};

exports.getTables = async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurant_id;
        const tables = await Table.findByRestaurantId(restaurantId);
        return successResponse(res, tables, 'Tables retrieved');
    } catch (error) {
        next(error);
    }
};

exports.updateTable = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { table_number, capacity, status, qr_code_url } = req.body;
        const restaurantId = req.user.restaurant_id;

        // Verify ownership
        const table = await Table.findById(id);
        if (!table || table.restaurant_id !== restaurantId) {
            return errorResponse(res, 'Table not found', 404);
        }

        const updates = {};
        if (table_number) updates.table_number = table_number;
        if (capacity) updates.capacity = parseInt(capacity);
        if (status) updates.status = status;
        if (qr_code_url !== undefined) updates.qr_code_url = qr_code_url;

        const updatedTable = await Table.update(id, updates);

        // Notify via Socket.IO if status changed
        if (status && updates.status !== table.status) {
            const io = req.app.get('io');
            io.to(`restaurant:${restaurantId}`).emit('tableStatusUpdate', {
                table_id: id,
                status: status
            });
        }

        await logUpdate(req.user.id, 'restaurant_admin', 'TABLE', id, table, updatedTable, req);
        return successResponse(res, updatedTable, 'Table updated');
    } catch (error) {
        next(error);
    }
};

exports.deleteTable = async (req, res, next) => {
    try {
        const { id } = req.params;
        const restaurantId = req.user.restaurant_id;

        const table = await Table.findById(id);
        if (!table || table.restaurant_id !== restaurantId) {
            return errorResponse(res, 'Table not found', 404);
        }

        await Table.delete(id);
        await logDelete(req.user.id, 'restaurant_admin', 'TABLE', id, table, req);
        return successResponse(res, null, 'Table deleted');
    } catch (error) {
        next(error);
    }
};

exports.getTableActiveOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const restaurantId = req.user.restaurant_id;

        // Verify table ownership
        const table = await Table.findById(id);
        if (!table || table.restaurant_id !== restaurantId) {
            return errorResponse(res, 'Table not found', 404);
        }

        const activeOrder = await Order.findActiveByTableId(id);

        return successResponse(res, activeOrder, activeOrder ? 'Active order found' : 'No active order');

    } catch (error) {
        next(error);
    }
};
