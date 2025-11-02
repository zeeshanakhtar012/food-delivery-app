const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Protected routes - super admin only
router.use(authenticate);
router.use(authorize('super_admin'));

router.get('/', auditLogController.getAuditLogs);
router.get('/entity/:entity_type/:entity_id', auditLogController.getLogsByEntity);

// Two routes: one with user_type, one without
router.get('/user/:user_id/:user_type', auditLogController.getLogsByUser);
router.get('/user/:user_id', auditLogController.getLogsByUser);

module.exports = router;