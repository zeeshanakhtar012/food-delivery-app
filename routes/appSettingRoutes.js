const express = require('express');
const router = express.Router();
const appSettingController = require('../controllers/appSettingController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Protected routes - super admin only
router.use(authenticate);
router.use(authorize('super_admin'));

router.get('/', appSettingController.getAllSettings);
router.get('/:key', appSettingController.getSetting);
router.post('/', appSettingController.upsertSetting);
router.put('/:key', appSettingController.updateSetting);
router.delete('/:key', appSettingController.deleteSetting);

module.exports = router;

