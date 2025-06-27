const express = require('express');
const router = express.Router();
const cityController = require('../../../controllers/admin/cityController');
const superadminMiddleware = require('../../../middleware/superadminMiddleware');

router.post('/', superadminMiddleware, cityController.createCity);
router.get('/', superadminMiddleware, cityController.getAllCities);
router.patch('/:id', superadminMiddleware, cityController.updateCity);
router.delete('/:id', superadminMiddleware, cityController.deleteCity);

module.exports = router;