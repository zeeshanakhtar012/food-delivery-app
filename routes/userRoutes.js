const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  updateUserProfile, 
  changePassword,
  deleteAccount,
  addAddress,
  removeAddress,
  setDefaultAddress,
  updatePreferences,
  logoutUser
} = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes
router.get('/profile', authMiddleware, getUserProfile);
router.post('/profile', authMiddleware, updateUserProfile);
router.post('/change-password', authMiddleware, changePassword);
router.delete('/account', authMiddleware, deleteAccount);
router.post('/addresses', authMiddleware, addAddress);
router.delete('/addresses/:addressId', authMiddleware, removeAddress);
router.post('/addresses/:addressId/default', authMiddleware, setDefaultAddress);
router.post('/preferences', authMiddleware, updatePreferences);
router.post('/logout', authMiddleware, logoutUser);

module.exports = router;