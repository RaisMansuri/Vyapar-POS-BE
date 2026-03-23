const Transaction = require('../models/transaction.model');
const { Op } = require('sequelize');
const { successResponse, errorResponse } = require('../utils/response');

// Helper to generate a unique transaction ID
const generateTransactionId = async () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
  const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));

  const count = await Transaction.count({
    where: {
      createdAt: {
        [Op.between]: [startOfDay, endOfDay]
      }
    }
  });
  return `TXN-${date}-${(count + 1).toString().padStart(3, '0')}`;
};

// Create a transaction
exports.recordTransaction = async (data) => {
  try {
    const transactionId = await generateTransactionId();
    const transactionData = {
      ...data,
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
    const where = {};

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
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return errorResponse(res, 'Transaction not found', 404);
    }
    return successResponse(res, transaction, 'Transaction retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve transaction', 500, error);
  }
};
