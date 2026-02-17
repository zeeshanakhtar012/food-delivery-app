const { query } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

const Reservation = {
    // Create reservation
    create: async (data) => {
        const { restaurant_id, customer_name, customer_phone, table_id, reservation_time, guest_count, notes, user_id } = data;

        const result = await query(
            `INSERT INTO reservations (
         id, restaurant_id, customer_name, customer_phone, 
         table_id, reservation_time, guest_count, notes, user_id, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
       RETURNING *`,
            [
                uuidv4(), restaurant_id, customer_name, customer_phone,
                table_id || null, reservation_time, guest_count || 2,
                notes || null, user_id || null
            ]
        );

        return result.rows[0];
    },

    // Find by ID
    findById: async (id) => {
        const result = await query(
            `SELECT r.*, t.table_number 
       FROM reservations r
       LEFT JOIN restaurant_tables t ON r.table_id = t.id
       WHERE r.id = $1`,
            [id]
        );
        return result.rows[0];
    },

    // Get for restaurant (filtered by date if provided)
    findByRestaurantId: async (restaurant_id, date = null, status = null) => {
        let sql = `
      SELECT r.*, t.table_number 
      FROM reservations r
      LEFT JOIN restaurant_tables t ON r.table_id = t.id
      WHERE r.restaurant_id = $1
    `;
        const params = [restaurant_id];
        let paramCount = 2;

        if (date) {
            sql += ` AND DATE(r.reservation_time) = $${paramCount++}`;
            params.push(date);
        }

        if (status) {
            sql += ` AND r.status = $${paramCount++}`;
            params.push(status);
        }

        sql += ' ORDER BY r.reservation_time ASC';

        const result = await query(sql, params);
        return result.rows;
    },

    // Update
    update: async (id, data) => {
        const { status, table_id, reservation_time, guest_count, notes } = data;
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (status) {
            updates.push(`status = $${paramCount++}`);
            values.push(status);
        }
        if (table_id !== undefined) {
            updates.push(`table_id = $${paramCount++}`);
            values.push(table_id);
        }
        if (reservation_time) {
            updates.push(`reservation_time = $${paramCount++}`);
            values.push(reservation_time);
        }
        if (guest_count) {
            updates.push(`guest_count = $${paramCount++}`);
            values.push(guest_count);
        }
        if (notes !== undefined) {
            updates.push(`notes = $${paramCount++}`);
            values.push(notes);
        }

        if (updates.length === 0) return null;

        values.push(id);
        const result = await query(
            `UPDATE reservations SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );
        return result.rows[0];
    },

    // Delete
    delete: async (id) => {
        const result = await query('DELETE FROM reservations WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
    }
};

module.exports = Reservation;
