const { query } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

const AppSetting = {
  // Create or update setting
  upsert: async (key, value, type = 'string', description = null) => {
    const result = await query(
      `INSERT INTO app_settings (id, key, value, type, description, updated_at)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (key) 
       DO UPDATE SET value = $2, type = $3, description = $4, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [key, value, type, description || null]
    );

    return result.rows[0];
  },

  // Get setting by key
  getByKey: async (key) => {
    const result = await query('SELECT * FROM app_settings WHERE key = $1', [key]);
    return result.rows[0];
  },

  // Get all settings
  getAll: async () => {
    const result = await query('SELECT * FROM app_settings ORDER BY key ASC');
    return result.rows;
  },

  // Get multiple settings by keys
  getByKeys: async (keys) => {
    if (!keys || keys.length === 0) return [];

    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const result = await query(
      `SELECT * FROM app_settings WHERE key IN (${placeholders})`,
      keys
    );

    return result.rows;
  },

  // Update setting value
  updateValue: async (key, value) => {
    const result = await query(
      `UPDATE app_settings 
       SET value = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE key = $2
       RETURNING *`,
      [value, key]
    );

    return result.rows[0];
  },

  // Delete setting
  delete: async (key) => {
    const result = await query('DELETE FROM app_settings WHERE key = $1 RETURNING *', [key]);
    return result.rows[0];
  },

  // Get setting value (with type casting)
  getValue: async (key, defaultValue = null) => {
    const setting = await AppSetting.getByKey(key);
    if (!setting) return defaultValue;

    const { value, type } = setting;

    switch (type) {
      case 'number':
        return parseFloat(value) || defaultValue;
      case 'boolean':
        return value === 'true' || value === '1';
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return defaultValue;
        }
      default:
        return value || defaultValue;
    }
  }
};

module.exports = AppSetting;

