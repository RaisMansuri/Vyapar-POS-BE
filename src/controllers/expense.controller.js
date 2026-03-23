const Expense = require('../models/expense.model');
const { Op, Sequelize } = require('sequelize');
const { successResponse, errorResponse } = require('../utils/response');

// Create a new expense
exports.createExpense = async (req, res) => {
  try {
    const { title, amount, category, date, description, paidBy } = req.body;

    const savedExpense = await Expense.create({
      title,
      amount,
      category,
      date: date || new Date(),
      description,
      paidBy: paidBy || req.user?.name || 'Admin'
    });

    // Record Transaction
    try {
      const transactionController = require('./transaction.controller');
      await transactionController.recordTransaction({
        type: 'Expense',
        amount: amount,
        paymentMethod: 'Cash',
        status: 'Completed',
        referenceId: savedExpense.id,
        referenceModel: 'Expense',
        processedBy: paidBy || 'Admin',
        description: `Expense: ${title}`
      });
    } catch (txnError) {
      console.error('Failed to record transaction for expense:', txnError);
    }

    return successResponse(res, savedExpense, 'Expense recorded successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to record expense', 400, error);
  }
};

// Get all expenses with filtering
exports.getExpenses = async (req, res) => {
  try {
    const { startDate, endDate, category, search } = req.query;
    const where = {};

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      where.date = { [Op.between]: [start, end] };
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const expenses = await Expense.findAll({
      where,
      order: [['date', 'DESC']]
    });
    return successResponse(res, expenses, 'Expenses retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve expenses', 500, error);
  }
};

// Update an expense
exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const [updatedCount] = await Expense.update(req.body, {
      where: { id }
    });
    
    if (updatedCount === 0) {
      return errorResponse(res, 'Expense not found', 404);
    }

    const updatedExpense = await Expense.findByPk(id);
    return successResponse(res, updatedExpense, 'Expense updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update expense', 400, error);
  }
};

// Delete an expense
exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCount = await Expense.destroy({ where: { id } });

    if (deletedCount === 0) {
      return errorResponse(res, 'Expense not found', 404);
    }

    return successResponse(res, null, 'Expense deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete expense', 500, error);
  }
};

// Get expense statistics for P&L
exports.getExpenseStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      where.date = { [Op.between]: [start, end] };
    }

    const stats = await Expense.findAll({
      where,
      attributes: [
        ['category', '_id'],
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'total'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['category'],
      raw: true
    });

    const overall = await Expense.findOne({
      where,
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalExpenses']
      ],
      raw: true
    });

    return successResponse(res, {
      byCategory: stats,
      total: overall?.totalExpenses || 0
    }, 'Expense statistics retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve expense stats', 500, error);
  }
};
