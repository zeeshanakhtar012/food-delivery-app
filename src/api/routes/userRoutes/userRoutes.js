const express = require('express');
const router = express.Router();
const userController = require('../../../controllers/user/userController');
const authMiddleware = require('../../../middleware/authMiddleware');
const fileUploadMiddleware = require('../../../middleware/fileUploadMiddleware');

router.post('/signup', userController.signup);
router.post('/login', userController.login);
router.get('/profile', authMiddleware, userController.getProfile);
router.patch('/profile', authMiddleware, userController.updateProfile);
router.post('/logout', authMiddleware, userController.logout);
router.post('/favorites', authMiddleware, userController.addFavorite);
router.delete('/favorites/:foodId', authMiddleware, userController.removeFavorite);
router.get('/favorites', authMiddleware, userController.getFavorites);
router.post('/profile/upload', authMiddleware, fileUploadMiddleware, userController.uploadProfileImage);

module.exports = router;