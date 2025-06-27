const multer = require('multer');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(file.originalname.split('.').pop().toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('File must be a valid image (jpg, jpeg, png)'));
  }
}).single('image');

module.exports = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      logger.error('File upload error', { error: err.message });
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};