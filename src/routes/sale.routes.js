const express = require('express');
const router = express.Router();
const saleController = require('../controllers/sale.controller');

// Create a sale
router.post('/', saleController.createSale);

// Get all sales
router.get('/', saleController.getSales);

// Get sales stats
router.get('/stats', saleController.getSalesStats);

// Get daily report
router.get('/daily-report', saleController.getDailyReport);

// Get sales report
router.get('/report', saleController.getSalesReport);

module.exports = router;
