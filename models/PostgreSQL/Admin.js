const { query } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const Admin = {
  // Create admin
  create: async (adminData) => {
    const { name, email, password, restaurant_id, role } = adminData;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await query(
      `INSERT INTO admins (id, name, email, password, restaurant_id, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, restaurant_id, role, created_at`,
      [uuidv4(), name, email, hashedPassword, restaurant_id || null, role || 'restaurant_admin']
    );
    return result.rows[0];
  },

  // Find admin by email
  findByEmail: async (email) => {
    const result = await query(
      'SELECT * FROM admins WHERE email = $1',
      [email]
    );
    return result.rows[0];
  },

  // Find admin by ID
  findById: async (id) => {
    const result = await query(
      `SELECT id, name, email, restaurant_id, role, created_at 
       FROM admins WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  },

  findByRestaurantId: async (restaurant_id) => {
    const result = await query(
      `SELECT id, name, email, restaurant_id, role, created_at 
       FROM admins WHERE restaurant_id = $1 ORDER BY created_at DESC`,
      [restaurant_id]
    );
    return result.rows;
  },

  // Get all super admins
  findSuperAdmins: async () => {
    const result = await query(
      `SELECT id, name, email, restaurant_id, role, created_at 
       FROM admins WHERE role = 'super_admin' ORDER BY created_at DESC`
    );
    return result.rows;
  },
// Update admin (excluding password unless explicitly provided)
// Inside Admin model
update: async (id, updates) => {
  const { name, email, password } = updates;

  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  if (name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`);
    values.push(name);
  }
  if (email !== undefined) {
    setClauses.push(`email = $${paramIndex++}`);
    values.push(email);
  }
  if (password !== undefined) {
    const hashedPassword = await bcrypt.hash(password, 10);
    setClauses.push(`password = $${paramIndex++}`);
    values.push(hashedPassword);
  }

  if (setClauses.length === 0) {
    return null;
  }

  const queryText = `
    UPDATE admins
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, name, email, restaurant_id, role, created_at
  `;

  values.push(id);

  const result = await query(queryText, values);
  return result.rows[0] || null;
},
  // Verify password
  comparePassword: async (candidatePassword, hashedPassword) => {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  },
};

module.exports = Admin;

