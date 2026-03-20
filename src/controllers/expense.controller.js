const Expense = require('../models/expense.model');
const { successResponse, errorResponse } = require('../utils/response');

// Create a new expense
exports.createExpense = async (req, res) => {
  try {
    const { title, amount, category, date, description, paidBy } = req.body;

    const newExpense = new Expense({
      title,
      amount,
      category,
      date: date || new Date(),
      description,
      paidBy: paidBy || req.user?.name || 'Admin'
    });

    const savedExpense = await newExpense.save();

    // Record Transaction
    try {
      const transactionController = require('./transaction.controller');
      await transactionController.recordTransaction({
        type: 'Expense',
        amount: amount,
        paymentMethod: 'Cash', // Default for expenses in this project
        status: 'Completed',
        referenceId: savedExpense._id,
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
    let query = {};

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const expenses = await Expense.find(query).sort({ date: -1 });
    return successResponse(res, expenses, 'Expenses retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve expenses', 500, error);
  }
};

// Update an expense
exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedExpense = await Expense.findByIdAndUpdate(id, req.body, { new: true });
    
    if (!updatedExpense) {
      return errorResponse(res, 'Expense not found', 404);
    }

    return successResponse(res, updatedExpense, 'Expense updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update expense', 400, error);
  }
};

// Delete an expense
exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedExpense = await Expense.findByIdAndDelete(id);

    if (!deletedExpense) {
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
    let matchQuery = {};

    if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) matchQuery.date.$gte = new Date(startDate);
      if (endDate) matchQuery.date.$lte = new Date(endDate);
    }

    const stats = await Expense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    const overall = await Expense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: "$amount" }
        }
      }
    ]);

    return successResponse(res, {
      byCategory: stats,
      total: overall[0]?.totalExpenses || 0
    }, 'Expense statistics retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve expense stats', 500, error);
  }
};
