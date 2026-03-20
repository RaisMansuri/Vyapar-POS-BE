const Sale = require('../models/sale.model');
const Expense = require('../models/expense.model');
const { successResponse, errorResponse } = require('../utils/response');

exports.getProfitLoss = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let saleMatch = {};
    let expenseMatch = {};

    if (startDate || endDate) {
      saleMatch.timestamp = {};
      expenseMatch.date = {};
      if (startDate) {
        saleMatch.timestamp.$gte = new Date(startDate);
        expenseMatch.date.$gte = new Date(startDate);
      }
      if (endDate) {
        saleMatch.timestamp.$lte = new Date(endDate);
        expenseMatch.date.$lte = new Date(endDate);
      }
    }

    // Aggregate Sales Data (Revenue & COGS)
    const salesData = await Sale.aggregate([
      { $match: saleMatch },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$totalAmount" },
          cogs: {
            $sum: {
              $reduce: {
                input: "$items",
                initialValue: 0,
                in: { $add: ["$$value", { $multiply: ["$$this.quantity", "$$this.costPrice"] }] }
              }
            }
          },
          taxAmount: { $sum: "$tax" },
          discountAmount: { $sum: "$discount" }
        }
      }
    ]);

    // Aggregate Expenses Data
    const expensesData = await Expense.aggregate([
      { $match: expenseMatch },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: "$amount" }
        }
      }
    ]);

    const stats = {
      revenue: salesData[0]?.revenue || 0,
      cogs: salesData[0]?.cogs || 0,
      grossProfit: (salesData[0]?.revenue || 0) - (salesData[0]?.cogs || 0),
      totalExpenses: expensesData[0]?.totalExpenses || 0,
      netProfit: ((salesData[0]?.revenue || 0) - (salesData[0]?.cogs || 0)) - (expensesData[0]?.totalExpenses || 0),
      tax: salesData[0]?.taxAmount || 0,
      discount: salesData[0]?.discountAmount || 0
    };

    return successResponse(res, stats, 'P&L report generated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to generate P&L report', 500, error);
  }
};
