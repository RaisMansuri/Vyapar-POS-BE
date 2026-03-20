const express = require('express');
const router = express.Router();
const marketingController = require('../controllers/marketing.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/send-bulk', protect, marketingController.sendBulkMessage);
router.get('/stats', protect, marketingController.getMarketingStats);

module.exports = router;
