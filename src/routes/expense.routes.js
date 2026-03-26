const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// All expense routes require authentication
router.use(protect);

router.post('/', authorize('admin', 'manager', 'accountant'), expenseController.createExpense);
router.get('/', authorize('admin', 'manager', 'accountant'), expenseController.getExpenses);
router.get('/stats', authorize('admin', 'manager', 'accountant'), expenseController.getExpenseStats);
router.put('/:id', authorize('admin', 'manager', 'accountant'), expenseController.updateExpense);
router.delete('/:id', authorize('admin', 'manager', 'accountant'), expenseController.deleteExpense);

module.exports = router;
