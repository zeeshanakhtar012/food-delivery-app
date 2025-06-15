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
  updatePreferences
} = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes
router.get('/profile', authMiddleware, getUserProfile);
router.put('/profile', authMiddleware, updateUserProfile);
router.patch('/change-password', authMiddleware, changePassword);
router.delete('/account', authMiddleware, deleteAccount);
router.post('/addresses', authMiddleware, addAddress);
router.delete('/addresses/:addressId', authMiddleware, removeAddress);
router.patch('/addresses/:addressId/default', authMiddleware, setDefaultAddress);
router.patch('/preferences', authMiddleware, updatePreferences);

module.exports = router;