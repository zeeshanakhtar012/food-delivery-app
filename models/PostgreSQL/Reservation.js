const { query } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

const Reservation = {
    // Create reservation
    create: async (data) => {
        const {
            restaurant_id, user_id, table_id,
            customer_name, customer_phone,
            reservation_time, guest_count, notes
        } = data;

        const result = await query(
            `INSERT INTO reservations (
        restaurant_id, user_id, table_id, 
        customer_name, customer_phone, 
        reservation_time, guest_count, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
            [
                restaurant_id, user_id || null, table_id || null,
                customer_name, customer_phone,
                reservation_time, guest_count || 2, notes || null
            ]
        );
        return result.rows[0];
    },

    // Find by ID
    findById: async (id) => {
        const result = await query('SELECT * FROM reservations WHERE id = $1', [id]);
        return result.rows[0];
    },

    // Find by Restaurant with filters
    findAll: async (restaurant_id, filters = {}) => {
        let sql = 'SELECT * FROM reservations WHERE restaurant_id = $1';
        const params = [restaurant_id];
        let paramCount = 2;

        if (filters.date) {
            // Simple date filtering (assuming exact date match or range if needed)
            // For now, let's just fetch all and filter in controller or add robust date logic
            // Ideally: WHERE reservation_time::date = $2
            sql += ` AND reservation_time::date = $${paramCount++}`;
            params.push(filters.date);
        }

        if (filters.status) {
            sql += ` AND status = $${paramCount++}`;
            params.push(filters.status);
        }

        sql += ' ORDER BY reservation_time ASC';

        const result = await query(sql, params);
        return result.rows;
    },

    // Update reservation
    update: async (id, updates) => {
        const { table_id, status, notes, reservation_time, guest_count, customer_name, customer_phone } = updates;
        const fields = [];
        const values = [];
        let paramCount = 1;

        if (table_id !== undefined) { fields.push(`table_id = $${paramCount++}`); values.push(table_id); }
        if (status !== undefined) { fields.push(`status = $${paramCount++}`); values.push(status); }
        if (notes !== undefined) { fields.push(`notes = $${paramCount++}`); values.push(notes); }
        if (reservation_time !== undefined) { fields.push(`reservation_time = $${paramCount++}`); values.push(reservation_time); }
        if (guest_count !== undefined) { fields.push(`guest_count = $${paramCount++}`); values.push(guest_count); }
        if (customer_name !== undefined) { fields.push(`customer_name = $${paramCount++}`); values.push(customer_name); }
        if (customer_phone !== undefined) { fields.push(`customer_phone = $${paramCount++}`); values.push(customer_phone); }

        if (fields.length === 0) return null;

        values.push(id);
        const sql = `UPDATE reservations SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`;

        const result = await query(sql, values);
        return result.rows[0];
    },

    // Delete reservation
    delete: async (id) => {
        const result = await query('DELETE FROM reservations WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
    }
};

module.exports = Reservation;
