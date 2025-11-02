const express = require('express');
const router = express.Router();
const userAddressController = require('../controllers/userAddressController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Protected routes
router.use(authenticate);
router.use(authorize('user'));

router.post('/', userAddressController.createAddress);
router.get('/', userAddressController.getAddresses);
router.get('/:id', userAddressController.getAddress);
router.put('/:id', userAddressController.updateAddress);
router.put('/:id/default', userAddressController.setDefaultAddress);
router.delete('/:id', userAddressController.deleteAddress);

module.exports = router;

