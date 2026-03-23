const Sale = require('../models/sale.model');
const Expense = require('../models/expense.model');
const { Op } = require('sequelize');
const { successResponse, errorResponse } = require('../utils/response');

exports.getProfitLoss = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const saleWhere = { userId: req.user.id };
    const expenseWhere = { userId: req.user.id };

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      saleWhere.timestamp = { [Op.between]: [start, end] };
      expenseWhere.date = { [Op.between]: [start, end] };
    }

    // Fetch Sales for calculation
    const sales = await Sale.findAll({ where: saleWhere, raw: true });
    
    let revenue = 0;
    let cogs = 0;
    let taxAmount = 0;
    let discountAmount = 0;

    sales.forEach(sale => {
        revenue += Number(sale.totalAmount || 0);
        taxAmount += Number(sale.tax || 0);
        discountAmount += Number(sale.discount || 0);
        
        const items = Array.isArray(sale.items) ? sale.items : [];
        items.forEach(item => {
            cogs += Number(item.quantity || 0) * Number(item.costPrice || 0);
        });
    });

    // Fetch Expenses
    const expenses = await Expense.findAll({ where: expenseWhere, raw: true });
    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

    const stats = {
      revenue,
      cogs,
      grossProfit: revenue - cogs,
      totalExpenses,
      netProfit: (revenue - cogs) - totalExpenses,
      tax: taxAmount,
      discount: discountAmount
    };

    return successResponse(res, stats, 'P&L report generated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to generate P&L report', 500, error);
  }
};
