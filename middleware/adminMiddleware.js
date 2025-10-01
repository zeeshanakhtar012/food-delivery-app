const AppUser = require('../models/AppUser');

module.exports = async (req, res, next) => {
  console.log('Admin middleware invoked');
  try {
    console.log('Fetching user with ID:', req.user?.userId);
    const user = await AppUser.findById(req.user.userId);
    if (!user) {
      console.log('User not found');
      return res.status(403).json({ message: 'Admin access required' });
    }
    if (!user.isAdmin) {
      console.log('User is not admin:', user._id);
      return res.status(403).json({ message: 'Admin access required' });
    }
    console.log('Admin access granted for user:', user._id);
    next();
  } catch (error) {
    console.error('Admin middleware error:', error.message);
    return res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};