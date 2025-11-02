/**
 * Audit logging service
 */

const { query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Create audit log entry
 */
const createAuditLog = async (auditData, req = null) => {
  try {
    const {
      user_id,
      user_type,
      action,
      entity_type,
      entity_id,
      old_values = null,
      new_values = null
    } = auditData;

    const ip_address = req?.ip || req?.connection?.remoteAddress || null;
    const user_agent = req?.get('user-agent') || null;

    await query(
      `INSERT INTO audit_logs (id, user_id, user_type, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        uuidv4(),
        user_id,
        user_type,
        action,
        entity_type,
        entity_id,
        old_values ? JSON.stringify(old_values) : null,
        new_values ? JSON.stringify(new_values) : null,
        ip_address,
        user_agent
      ]
    );
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw error - audit logging shouldn't break the main flow
  }
};

/**
 * Log entity creation
 */
const logCreate = async (user_id, user_type, entity_type, entity_id, new_values, req = null) => {
  await createAuditLog({
    user_id,
    user_type,
    action: `CREATE_${entity_type.toUpperCase()}`,
    entity_type,
    entity_id,
    new_values
  }, req);
};

/**
 * Log entity update
 */
const logUpdate = async (user_id, user_type, entity_type, entity_id, old_values, new_values, req = null) => {
  await createAuditLog({
    user_id,
    user_type,
    action: `UPDATE_${entity_type.toUpperCase()}`,
    entity_type,
    entity_id,
    old_values,
    new_values
  }, req);
};

/**
 * Log entity deletion
 */
const logDelete = async (user_id, user_type, entity_type, entity_id, old_values, req = null) => {
  await createAuditLog({
    user_id,
    user_type,
    action: `DELETE_${entity_type.toUpperCase()}`,
    entity_type,
    entity_id,
    old_values
  }, req);
};

/**
 * Log login
 */
const logLogin = async (user_id, user_type, req = null) => {
  await createAuditLog({
    user_id,
    user_type,
    action: 'LOGIN',
    entity_type: 'AUTH',
    entity_id: user_id
  }, req);
};

/**
 * Log custom action
 */
const logAction = async (user_id, user_type, action, entity_type = null, entity_id = null, data = null, req = null) => {
  await createAuditLog({
    user_id,
    user_type,
    action,
    entity_type,
    entity_id,
    new_values: data
  }, req);
};

module.exports = {
  createAuditLog,
  logCreate,
  logUpdate,
  logDelete,
  logLogin,
  logAction
};

