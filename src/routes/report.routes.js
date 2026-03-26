const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/profit-loss', authorize('admin', 'manager', 'accountant'), reportController.getProfitLoss);

module.exports = router;
