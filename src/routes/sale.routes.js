const express = require('express');
const router = express.Router();
const saleController = require('../controllers/sale.controller');

/**
 * @swagger
 * components:
 *   schemas:
 *     SaleItem:
 *       type: object
 *       properties:
 *         productId:
 *           type: string
 *         quantity:
 *           type: number
 *         price:
 *           type: number
 *     Sale:
 *       type: object
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SaleItem'
 *         totalAmount:
 *           type: number
 *         paymentMethod:
 *           type: string
 */

/**
 * @swagger
 * /api/sales:
 *   post:
 *     summary: Create a new sale
 *     tags: [Sales]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Sale'
 *     responses:
 *       201:
 *         description: Sale created
 *   get:
 *     summary: Get all sales
 *     tags: [Sales]
 *     responses:
 *       200:
 *         description: List of sales
 */
router.post('/', saleController.createSale);
router.get('/', saleController.getSales);

/**
 * @swagger
 * /api/sales/stats:
 *   get:
 *     summary: Get sales statistics
 *     tags: [Sales]
 *     responses:
 *       200:
 *         description: Sales stats
 */
router.get('/stats', saleController.getSalesStats);

/**
 * @swagger
 * /api/sales/daily-report:
 *   get:
 *     summary: Get daily sales report
 *     tags: [Sales]
 *     responses:
 *       200:
 *         description: Daily report
 */
router.get('/daily-report', saleController.getDailyReport);

/**
 * @swagger
 * /api/sales/report:
 *   get:
 *     summary: Get sales report
 *     tags: [Sales]
 *     responses:
 *       200:
 *         description: Sales report
 */
router.get('/report', saleController.getSalesReport);

module.exports = router;
