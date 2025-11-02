const express = require('express');
const router = express.Router();
const faqController = require('../controllers/faqController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Public routes
router.get('/active', faqController.getActiveFAQs);
router.get('/categories', faqController.getCategories);

// Protected routes - super admin
router.use(authenticate);
router.use(authorize('super_admin'));

router.post('/', faqController.createFAQ);
router.get('/all', faqController.getAllFAQs);
router.get('/:id', faqController.getFAQ);
router.put('/:id', faqController.updateFAQ);
router.delete('/:id', faqController.deleteFAQ);

module.exports = router;

