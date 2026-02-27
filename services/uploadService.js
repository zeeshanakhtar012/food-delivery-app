/**
 * Image upload service for AWS S3 or Cloudinary
 */

const AWS = require('aws-sdk');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

/**
 * Upload to AWS S3
 */
const uploadToS3 = (file, folder = 'uploads') => {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${folder}/${Date.now()}-${file.originalname}`,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read'
    };

    s3.upload(params, (err, data) => {
      if (err) reject(err);
      else resolve(data.Location);
    });
  });
};

/**
 * Upload to Cloudinary
 */
const uploadToCloudinary = (file, folder = 'uploads') => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: folder,
      resource_type: 'auto',
      transformation: [
        { width: 800, height: 800, crop: 'limit', quality: 'auto' }
      ]
    };

    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    ).end(file.buffer);
  });
};

/**
 * Delete from S3
 */
const deleteFromS3 = (url) => {
  const key = url.split('.com/')[1];
  return s3.deleteObject({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key
  }).promise();
};

/**
 * Delete from Cloudinary
 */
const deleteFromCloudinary = (url) => {
  const publicId = url.split('/').slice(-2).join('/').split('.')[0];
  return cloudinary.uploader.destroy(publicId);
};

/**
 * Upload image (supports S3 or Cloudinary)
 */
const uploadImage = async (file, folder = 'uploads') => {
  try {
    if (process.env.UPLOAD_PROVIDER === 'cloudinary') {
      return await uploadToCloudinary(file, folder);
    } else if (process.env.UPLOAD_PROVIDER === 's3') {
      return await uploadToS3(file, folder);
    } else {
      // Fallback to local storage
      const uploadDir = path.join(__dirname, '..', 'uploads', folder);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filename = `${Date.now()}-${uuidv4()}${path.extname(file.originalname || '')}`;
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, file.buffer);
      return `/uploads/${folder}/${filename}`;
    }
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

/**
 * Delete image
 */
const deleteImage = async (url) => {
  try {
    if (url.includes('cloudinary.com')) {
      return await deleteFromCloudinary(url);
    } else if (url.includes('amazonaws.com') || url.includes('s3')) {
      return await deleteFromS3(url);
    }
  } catch (error) {
    console.error('Delete image error:', error);
    // Don't throw error if image doesn't exist
  }
};

/**
 * Multer configuration for S3
 */
const multerS3Config = multerS3({
  s3: s3,
  bucket: process.env.AWS_BUCKET_NAME || 'default-bucket',
  acl: 'public-read',
  key: function (req, file, cb) {
    const folder = req.body.folder || 'uploads';
    cb(null, `${folder}/${Date.now()}-${file.originalname}`);
  }
});

/**
 * Multer configuration for memory storage
 */
const memoryStorage = multer.memoryStorage();

/**
 * Get multer upload middleware
 */
const getUploadMiddleware = (options = {}) => {
  const {
    fieldName = 'image',
    maxCount = 1,
    maxSize = 5 * 1024 * 1024, // 5MB
    allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  } = options;

  const storage = process.env.UPLOAD_PROVIDER === 's3'
    ? multerS3Config
    : memoryStorage;

  return multer({
    storage,
    limits: { fileSize: maxSize },
    fileFilter: (req, file, cb) => {
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type. Allowed: ${allowedMimes.join(', ')}`));
      }
    }
  });
};

module.exports = {
  uploadImage,
  deleteImage,
  getUploadMiddleware
};

