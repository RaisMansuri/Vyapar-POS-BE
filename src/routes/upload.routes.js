const express = require('express');
const router = express.Router();
const multer = require('multer');
const storageService = require('../services/storage.service');
const authMiddleware = require('../middleware/auth.middleware');
const { successResponse, errorResponse } = require('../utils/response');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

router.use(authMiddleware);

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload a file to cloud storage
 *     tags: [Upload]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               folder:
 *                 type: string
 *                 example: 'avatars'
 *     responses:
 *       200:
 *         description: File uploaded successfully
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No file uploaded', 400);
    }

    const { folder = 'general' } = req.body;
    const publicUrl = await storageService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      folder
    );

    return successResponse(res, { url: publicUrl }, 'File uploaded successfully');
  } catch (error) {
    console.error('Upload Route Error:', error);
    return errorResponse(res, 'Failed to upload file', 500, error);
  }
});

module.exports = router;
