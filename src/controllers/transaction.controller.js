const Transaction = require('../models/transaction.model');
const { Op } = require('sequelize');
const { successResponse, errorResponse } = require('../utils/response');

// Helper to generate a unique transaction ID
const generateTransactionId = async (userId) => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
  const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));

  const count = await Transaction.count({
    where: {
      createdAt: {
        [Op.between]: [startOfDay, endOfDay]
      },
      userId
    }
  });
  return `TXN-${date}-${(count + 1).toString().padStart(3, '0')}`;
};

// Create a transaction
exports.recordTransaction = async (data) => {
  try {
    // Normalize paymentMethod for Enum validation
    let normalizedPaymentMethod = data.paymentMethod;
    if (data.paymentMethod && typeof data.paymentMethod === 'string') {
      const pm = data.paymentMethod.toLowerCase();
      if (pm === 'upi') normalizedPaymentMethod = 'UPI';
      else if (pm === 'cash') normalizedPaymentMethod = 'Cash';
      else if (pm === 'card') normalizedPaymentMethod = 'Card';
      else {
          // Default to Cash or capitalize first letter as fallback
          normalizedPaymentMethod = pm.charAt(0) ? pm.charAt(0).toUpperCase() + pm.slice(1) : 'Cash';
      }
    }

    const transactionId = await generateTransactionId(data.userId);
    const transactionData = {
      ...data,
      paymentMethod: normalizedPaymentMethod,
      transactionId,
      timestamp: data.timestamp || new Date()
    };
    return await Transaction.create(transactionData);
  } catch (error) {
    console.error('Failed to record transaction:', error);
    throw error;
  }
};

// Get all transactions
exports.getTransactions = async (req, res) => {
  try {
    const { startDate, endDate, type, paymentMethod, status, search } = req.query;
    const where = { userId: req.user.id };

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      where.timestamp = { [Op.between]: [start, end] };
    }

    if (type) where.type = type;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (status) where.status = status;

    if (search) {
      where[Op.or] = [
        { transactionId: { [Op.iLike]: `%${search}%` } },
        { customerName: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const transactions = await Transaction.findAll({
      where,
      order: [['timestamp', 'DESC']]
    });
    return successResponse(res, transactions, 'Transactions retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve transactions', 500, error);
  }
};

// Get single transaction
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ 
      where: { id: req.params.id, userId: req.user.id } 
    });
    if (!transaction) {
      return errorResponse(res, 'Transaction not found', 404);
    }
    return successResponse(res, transaction, 'Transaction retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve transaction', 500, error);
  }
};
// Get transaction statistics
exports.getTransactionStats = async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      where: { userId: req.user.id }
    });

    const stats = {
      totalVolume: 0,
      upiVolume: 0,
      cashVolume: 0,
      cardVolume: 0,
      refundVolume: 0,
      totalCount: transactions.length,
      completedCount: 0,
      settledRate: 0
    };

    transactions.forEach(t => {
      const amount = parseFloat(t.amount) || 0;
      
      if (t.status === 'Completed') {
        stats.completedCount++;
        // Count Sales, Expenses and Refunds towards method-specific volume
        if (t.type === 'Sale') {
          stats.totalVolume += amount;
        } else if (t.type === 'Refund') {
          stats.refundVolume += amount;
          stats.totalVolume -= amount; // Deduct refunds from total volume if appropriate
        } else if (t.type === 'Expense') {
          stats.totalVolume -= amount; // Deduct expenses from net volume or track separately
          // We can add a totalExpenseVolume if needed
          stats.expenseVolume = (stats.expenseVolume || 0) + amount;
        }

        // Add to payment method buckets regardless of type (to show total flow per method)
        if (t.paymentMethod === 'UPI') stats.upiVolume += amount;
        else if (t.paymentMethod === 'Cash') stats.cashVolume += amount;
        else if (t.paymentMethod === 'Card') stats.cardVolume += amount;
      }
    });

    if (stats.totalCount > 0) {
      stats.settledRate = parseFloat(((stats.completedCount / stats.totalCount) * 100).toFixed(1));
    }

    return successResponse(res, stats, 'Transaction statistics retrieved successfully');
  } catch (error) {
    console.error('Failed to get transaction stats:', error);
    return errorResponse(res, 'Failed to get transaction statistics', 500, error);
  }
};
