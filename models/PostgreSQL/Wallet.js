const { query } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

const Wallet = {
  // Get wallet balance
  getBalance: async (rider_id) => {
    const result = await query(
      'SELECT wallet_balance, total_earnings FROM riders WHERE id = $1',
      [rider_id]
    );

    return result.rows[0];
  },

  // Add transaction
  addTransaction: async (transactionData) => {
    const {
      rider_id,
      order_id,
      type,
      amount,
      description,
      status = 'completed'
    } = transactionData;

    // Get current balance
    const rider = await query('SELECT wallet_balance FROM riders WHERE id = $1', [rider_id]);
    const currentBalance = parseFloat(rider.rows[0].wallet_balance || 0);

    let newBalance = currentBalance;
    if (type === 'earning') {
      newBalance = currentBalance + parseFloat(amount);
    } else if (type === 'withdrawal') {
      newBalance = currentBalance - parseFloat(amount);
    } else if (type === 'adjustment') {
      newBalance = currentBalance + parseFloat(amount);
    }

    // Create transaction
    const result = await query(
      `INSERT INTO rider_wallet_transactions (id, rider_id, order_id, type, amount, balance_after, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [uuidv4(), rider_id, order_id || null, type, amount, newBalance, description || null, status]
    );

    // Update rider wallet balance
    if (status === 'completed') {
      if (type === 'earning') {
        await query(
          'UPDATE riders SET wallet_balance = $1, total_earnings = total_earnings + $2 WHERE id = $3',
          [newBalance, amount, rider_id]
        );
      } else if (type === 'withdrawal') {
        await query(
          'UPDATE riders SET wallet_balance = $1 WHERE id = $2',
          [newBalance, rider_id]
        );
      }
    }

    return result.rows[0];
  },

  // Get transactions
  getTransactions: async (rider_id, page = 1, limit = 20, type = null) => {
    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM rider_wallet_transactions WHERE rider_id = $1';
    const params = [rider_id];
    let paramCount = 2;

    if (type) {
      sql += ` AND type = $${paramCount++}`;
      params.push(type);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    const countSql = type
      ? 'SELECT COUNT(*) as total FROM rider_wallet_transactions WHERE rider_id = $1 AND type = $2'
      : 'SELECT COUNT(*) as total FROM rider_wallet_transactions WHERE rider_id = $1';

    const countResult = await query(countSql, type ? [rider_id, type] : [rider_id]);

    return {
      transactions: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit
    };
  },

  // Create withdrawal request
  createWithdrawal: async (withdrawalData) => {
    const {
      rider_id,
      amount,
      bank_name,
      account_number,
      account_holder_name
    } = withdrawalData;

    // Check balance
    const rider = await query('SELECT wallet_balance FROM riders WHERE id = $1', [rider_id]);
    const balance = parseFloat(rider.rows[0].wallet_balance || 0);

    if (balance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    // Create withdrawal request
    const result = await query(
      `INSERT INTO rider_withdrawals (id, rider_id, amount, bank_name, account_number, account_holder_name, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [uuidv4(), rider_id, amount, bank_name, account_number, account_holder_name]
    );

    // Create transaction with pending status
    await Wallet.addTransaction({
      rider_id,
      type: 'withdrawal',
      amount,
      description: 'Withdrawal request',
      status: 'pending'
    });

    return result.rows[0];
  },

  // Get withdrawals
  getWithdrawals: async (rider_id, page = 1, limit = 20, status = null) => {
    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM rider_withdrawals WHERE rider_id = $1';
    const params = [rider_id];
    let paramCount = 2;

    if (status) {
      sql += ` AND status = $${paramCount++}`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    const countSql = status
      ? 'SELECT COUNT(*) as total FROM rider_withdrawals WHERE rider_id = $1 AND status = $2'
      : 'SELECT COUNT(*) as total FROM rider_withdrawals WHERE rider_id = $1';

    const countResult = await query(countSql, status ? [rider_id, status] : [rider_id]);

    return {
      withdrawals: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit
    };
  },

  // Get earnings summary
  getEarningsSummary: async (rider_id, start_date = null, end_date = null) => {
    let sql = `
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'earning' AND status = 'completed' THEN amount ELSE 0 END), 0) as total_earnings,
        COALESCE(SUM(CASE WHEN type = 'withdrawal' AND status = 'completed' THEN amount ELSE 0 END), 0) as total_withdrawals,
        COALESCE(SUM(CASE WHEN type = 'withdrawal' AND status = 'pending' THEN amount ELSE 0 END), 0) as pending_withdrawals,
        COUNT(CASE WHEN type = 'earning' AND status = 'completed' THEN 1 END) as completed_deliveries
      FROM rider_wallet_transactions
      WHERE rider_id = $1
    `;
    const params = [rider_id];
    let paramCount = 2;

    if (start_date) {
      sql += ` AND created_at >= $${paramCount++}`;
      params.push(start_date);
    }

    if (end_date) {
      sql += ` AND created_at <= $${paramCount++}`;
      params.push(end_date);
    }

    const result = await query(sql, params);
    return result.rows[0];
  }
};

module.exports = Wallet;

