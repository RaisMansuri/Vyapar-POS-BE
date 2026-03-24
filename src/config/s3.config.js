const { S3Client } = require('@aws-sdk/client-s3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const s3Client = new S3Client({
  forcePathStyle: true,
  region: process.env.S3_REGION || 'ap-northeast-2',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

module.exports = s3Client;
