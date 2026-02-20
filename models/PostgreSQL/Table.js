const { query } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

const Table = {
    create: async (data) => {
        const { restaurant_id, table_number, capacity, qr_code_url } = data;
        const result = await query(
            `INSERT INTO restaurant_tables (id, restaurant_id, table_number, capacity, qr_code_url, status)
       VALUES ($1, $2, $3, $4, $5, 'available')
       RETURNING *`,
            [uuidv4(), restaurant_id, table_number, capacity || 4, qr_code_url]
        );
        return result.rows[0];
    },

    findByRestaurantId: async (restaurant_id) => {
        const result = await query(
            `SELECT * FROM restaurant_tables 
       WHERE restaurant_id = $1 
       ORDER BY table_number ASC`,
            [restaurant_id]
        );
        return result.rows;
    },

    findById: async (id) => {
        const result = await query('SELECT * FROM restaurant_tables WHERE id = $1', [id]);
        return result.rows[0];
    },

    update: async (id, updates) => {
        const validFields = ['table_number', 'capacity', 'status', 'qr_code_url'];
        const fields = [];
        const values = [];
        let idx = 1;

        Object.keys(updates).forEach(key => {
            if (validFields.includes(key)) {
                fields.push(`${key} = $${idx++}`);
                values.push(updates[key]);
            }
        });

        if (fields.length === 0) return null;

        values.push(id);
        const result = await query(
            `UPDATE restaurant_tables SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );
        return result.rows[0];
    },

    delete: async (id) => {
        await query('DELETE FROM restaurant_tables WHERE id = $1', [id]);
        return true;
    }
};

module.exports = Table;
