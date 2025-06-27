const AWS = require('aws-sdk');

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

const uploadToS3 = async (file, path) => {
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: `${path}/${Date.now()}-${file.originalname}`,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read'
    };
    const { Location } = await s3.upload(params).promise();
    return Location;
  } catch (error) {
    throw new Error(`S3 upload failed: ${error.message}`);
  }
};

module.exports = { s3, uploadToS3 };