const express = require('express');
const router = express.Router();
const AiController = require('../controllers/ai.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     summary: Chat with Vyapar AI Assistant
 *     tags: [AI]
 */
router.post('/chat', AiController.chat);

module.exports = router;
