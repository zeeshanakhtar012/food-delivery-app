const { query } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const RestaurantStaff = {
  // Create staff member
  create: async (staffData) => {
    const {
      restaurant_id,
      name,
      email,
      password,
      phone,
      role
    } = staffData;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO restaurant_staff (id, restaurant_id, name, email, password, phone, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, phone, role, is_active, created_at`,
      [uuidv4(), restaurant_id, name, email, hashedPassword, phone || null, role]
    );

    return result.rows[0];
  },

  // Find by ID
  findById: async (id) => {
    const result = await query(
      `SELECT id, name, email, phone, role, is_active, created_at 
       FROM restaurant_staff WHERE id = $1`,
      [id]
    );

    return result.rows[0];
  },

  // Find by email and restaurant
  findByEmailAndRestaurant: async (email, restaurant_id) => {
    const result = await query(
      'SELECT * FROM restaurant_staff WHERE email = $1 AND restaurant_id = $2',
      [email, restaurant_id]
    );

    return result.rows[0];
  },

  // Find by email only (for global login)
  findByEmail: async (email) => {
    const result = await query(
      'SELECT * FROM restaurant_staff WHERE email = $1 AND is_active = true',
      [email]
    );

    return result.rows[0];
  },

  // Get all staff for restaurant
  findByRestaurantId: async (restaurant_id, role = null) => {
    let sql = `
      SELECT id, name, email, phone, role, is_active, created_at 
      FROM restaurant_staff WHERE restaurant_id = $1
    `;
    const params = [restaurant_id];
    let paramCount = 2;

    if (role) {
      sql += ` AND role = $${paramCount++}`;
      params.push(role);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    return result.rows;
  },

  // Verify password
  comparePassword: async (candidatePassword, hashedPassword) => {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  },

  // Update staff
  update: async (id, updateData) => {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['name', 'email', 'phone', 'role', 'is_active'];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    }

    // Handle password update separately
    if (updateData.password) {
      const hashedPassword = await bcrypt.hash(updateData.password, 10);
      updates.push(`password = $${paramCount++}`);
      values.push(hashedPassword);
    }

    if (updates.length === 0) return null;

    values.push(id);
    const result = await query(
      `UPDATE restaurant_staff SET ${updates.join(', ')} WHERE id = $${paramCount} 
       RETURNING id, name, email, phone, role, is_active, created_at`,
      values
    );

    return result.rows[0];
  },

  // Delete staff
  delete: async (id) => {
    const result = await query('DELETE FROM restaurant_staff WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }
};

module.exports = RestaurantStaff;

