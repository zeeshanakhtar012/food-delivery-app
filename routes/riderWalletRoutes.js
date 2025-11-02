const express = require('express');
const router = express.Router();
const riderWalletController = require('../controllers/riderWalletController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Protected routes - rider
router.use(authenticate);
router.use(authorize('rider'));

router.get('/balance', riderWalletController.getWalletBalance);
router.get('/transactions', riderWalletController.getTransactions);
router.get('/earnings', riderWalletController.getEarningsSummary);
router.post('/withdraw', riderWalletController.createWithdrawal);
router.get('/withdrawals', riderWalletController.getWithdrawals);

module.exports = router;

