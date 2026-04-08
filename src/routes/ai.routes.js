const express = require('express');
const router = express.Router();
const AiController = require('../controllers/ai.controller');
const authMiddleware = require('../middleware/auth.middleware');

// router.use(authMiddleware); // Authentication disabled for AI assistant

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     summary: Chat with Vyapar AI Assistant
 *     tags: [AI]
 */
router.post('/chat', AiController.chat);
router.get('/history', authMiddleware, AiController.getChatHistory); // Keep history authenticated
router.delete('/history', authMiddleware, AiController.clearChatHistory); // Keep history authenticated
router.post('/send-invoice', AiController.sendInvoice);

module.exports = router;
