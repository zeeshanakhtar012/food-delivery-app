const Wallet = require('../models/PostgreSQL/Wallet');
const { successResponse, errorResponse, paginatedResponse } = require('../helpers/response');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');

// Get wallet balance
exports.getWalletBalance = async (req, res, next) => {
  try {
    const balance = await Wallet.getBalance(req.user.id);
    return successResponse(res, balance, 'Wallet balance retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get transactions
exports.getTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const result = await Wallet.getTransactions(req.user.id, page, limit, type || null);
    const pagination = getPaginationMeta(page, limit, result.total);

    return paginatedResponse(res, result.transactions, pagination, 'Transactions retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get earnings summary
exports.getEarningsSummary = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const summary = await Wallet.getEarningsSummary(
      req.user.id,
      start_date ? new Date(start_date) : null,
      end_date ? new Date(end_date) : null
    );

    return successResponse(res, summary, 'Earnings summary retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Create withdrawal request
exports.createWithdrawal = async (req, res, next) => {
  try {
    const { amount, bank_name, account_number, account_holder_name } = req.body;

    if (!amount || !bank_name || !account_number || !account_holder_name) {
      return errorResponse(res, 'Amount, bank name, account number, and account holder name are required', 400);
    }

    const withdrawal = await Wallet.createWithdrawal({
      rider_id: req.user.id,
      amount: parseFloat(amount),
      bank_name,
      account_number,
      account_holder_name
    });

    return successResponse(res, withdrawal, 'Withdrawal request created successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// Get withdrawals
exports.getWithdrawals = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const result = await Wallet.getWithdrawals(req.user.id, page, limit, status || null);
    const pagination = getPaginationMeta(page, limit, result.total);

    return paginatedResponse(res, result.withdrawals, pagination, 'Withdrawals retrieved successfully');
  } catch (error) {
    next(error);
  }
};

