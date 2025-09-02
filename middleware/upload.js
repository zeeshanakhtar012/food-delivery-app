const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const restaurantUploadPath = path.join(__dirname, '../uploads/restaurants');
const foodUploadPath = path.join(__dirname, '../uploads/foods');

if (!fs.existsSync(restaurantUploadPath)) {
  fs.mkdirSync(restaurantUploadPath, { recursive: true });
}
if (!fs.existsSync(foodUploadPath)) {
  fs.mkdirSync(foodUploadPath, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'restaurantImages') {
      cb(null, restaurantUploadPath);
    } else if (file.fieldname === 'foodImages') {
      cb(null, foodUploadPath);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only .jpg, .jpeg, and .png files are allowed!'), false);
  }
};

// Multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = upload;