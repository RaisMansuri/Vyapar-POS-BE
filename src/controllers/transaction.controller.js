const Transaction = require('../models/transaction.model');
const { successResponse, errorResponse } = require('../utils/response');

// Helper to generate a unique transaction ID (e.g., TXN-20231027-001)
const generateTransactionId = async () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await Transaction.countDocuments({
    createdAt: {
      $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      $lt: new Date(new Date().setHours(23, 59, 59, 999))
    }
  });
  return `TXN-${date}-${(count + 1).toString().padStart(3, '0')}`;
};

// Create a transaction (Internal helper or API if needed)
exports.recordTransaction = async (data) => {
  try {
    const transactionId = await generateTransactionId();
    const newTransaction = new Transaction({
      ...data,
      transactionId
    });
    return await newTransaction.save();
  } catch (error) {
    console.error('Failed to record transaction:', error);
    throw error;
  }
};

// Get all transactions with filtering
exports.getTransactions = async (req, res) => {
  try {
    const { startDate, endDate, type, paymentMethod, status, search } = req.query;
    let query = {};

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    if (type) query.type = type;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (status) query.status = status;

    if (search) {
      query.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const transactions = await Transaction.find(query).sort({ timestamp: -1 });
    return successResponse(res, transactions, 'Transactions retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve transactions', 500, error);
  }
};

// Get single transaction
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return errorResponse(res, 'Transaction not found', 404);
    }
    return successResponse(res, transaction, 'Transaction retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve transaction', 500, error);
  }
};
