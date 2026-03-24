const supabase = require('../config/supabase.config');
const s3Client = require('../config/s3.config');
const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

class StorageService {
  constructor() {
    this.useS3 = !!(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
    this.bucketName = process.env.S3_BUCKET_NAME || process.env.SUPABASE_BUCKET || 'vyapar-pos-assets';
  }

  /**
   * Upload a file buffer to storage (S3 or Supabase JS)
   * @param {Buffer} fileBuffer - The file content
   * @param {string} fileName - Original filename
   * @param {string} mimeType - File mimetype
   * @param {string} folder - Target folder (e.g., 'avatars', 'products')
   * @returns {Promise<string>} - Public URL of the uploaded file
   */
  async uploadFile(fileBuffer, fileName, mimeType, folder = 'general') {
    try {
      const fileExt = fileName.split('.').pop();
      const path = `${folder}/${uuidv4()}.${fileExt}`;

      if (this.useS3) {
        console.log('Using S3 for file upload...');
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: path,
          Body: fileBuffer,
          ContentType: mimeType,
        });

        await s3Client.send(command);
        
        // Construct public URL for Supabase S3
        // Format: https://[project-id].supabase.co/storage/v1/object/public/[bucket]/[path]
        const projectId = process.env.S3_ENDPOINT?.split('//')[1]?.split('.')[0] || 'your-project-id';
        return `https://${projectId}.supabase.co/storage/v1/object/public/${this.bucketName}/${path}`;
      } else {
        if (!supabase) {
          throw new Error('Storage configuration missing (both S3 and Supabase JS client are unconfigured).');
        }
        console.log('Using Supabase JS client for file upload...');
        const { data, error } = await supabase.storage
          .from(this.bucketName)
          .upload(path, fileBuffer, {
            contentType: mimeType,
            upsert: true
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from(this.bucketName)
          .getPublicUrl(path);

        return publicUrl;
      }
    } catch (error) {
      console.error('Storage Upload Error:', error);
      throw error;
    }
  }

  /**
   * Delete a file from storage
   * @param {string} publicUrl - The public URL of the file
   */
  async deleteFile(publicUrl) {
    try {
      // Extract path from public URL
      const path = publicUrl.split(`${this.bucketName}/`).pop();

      if (this.useS3) {
        const command = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: path,
        });
        await s3Client.send(command);
      } else {
        const { error } = await supabase.storage
          .from(this.bucketName)
          .remove([path]);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Storage Delete Error:', error);
    }
  }
}

module.exports = new StorageService();
