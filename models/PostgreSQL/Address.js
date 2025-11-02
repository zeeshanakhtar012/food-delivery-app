const { query } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

const Address = {
  // Create address
  create: async (addressData) => {
    const {
      user_id,
      label,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
      lat,
      lng,
      is_default = false,
      contact_name,
      contact_phone
    } = addressData;

    // If setting as default, unset other defaults
    if (is_default) {
      await query(
        'UPDATE user_addresses SET is_default = false WHERE user_id = $1',
        [user_id]
      );
    }

    const result = await query(
      `INSERT INTO user_addresses (id, user_id, label, address_line1, address_line2, city, state, postal_code, country, lat, lng, is_default, contact_name, contact_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [uuidv4(), user_id, label, address_line1, address_line2 || null, city, state || null, postal_code || null, country, lat, lng, is_default, contact_name || null, contact_phone || null]
    );

    return result.rows[0];
  },

  // Find address by ID
  findById: async (id) => {
    const result = await query('SELECT * FROM user_addresses WHERE id = $1', [id]);
    return result.rows[0];
  },

  // Get all addresses for user
  findByUserId: async (user_id) => {
    const result = await query(
      'SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [user_id]
    );

    return result.rows;
  },

  // Get default address for user
  getDefaultAddress: async (user_id) => {
    const result = await query(
      'SELECT * FROM user_addresses WHERE user_id = $1 AND is_default = true LIMIT 1',
      [user_id]
    );

    return result.rows[0];
  },

  // Update address
  update: async (id, updateData) => {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['label', 'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country', 'lat', 'lng', 'contact_name', 'contact_phone', 'is_default'];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    }

    // If setting as default, unset other defaults
    if (updateData.is_default) {
      const address = await Address.findById(id);
      if (address) {
        await query(
          'UPDATE user_addresses SET is_default = false WHERE user_id = $1 AND id != $2',
          [address.user_id, id]
        );
      }
    }

    if (updates.length === 0) return null;

    values.push(id);
    const result = await query(
      `UPDATE user_addresses SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0];
  },

  // Set default address
  setDefault: async (id, user_id) => {
    // Unset all defaults for user
    await query(
      'UPDATE user_addresses SET is_default = false WHERE user_id = $1',
      [user_id]
    );

    // Set this address as default
    const result = await query(
      'UPDATE user_addresses SET is_default = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, user_id]
    );

    return result.rows[0];
  },

  // Delete address
  delete: async (id) => {
    const result = await query('DELETE FROM user_addresses WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }
};

module.exports = Address;

