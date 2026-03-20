const Sale = require('../models/sale.model');
const Product = require('../models/product.model');
const Customer = require('../models/customer.model');
const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../utils/response');

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Helper to generate a unique sale number (e.g., SAL-20231027-001)
const generateSaleNumber = async () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await Sale.countDocuments({
    timestamp: {
      $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      $lt: new Date(new Date().setHours(23, 59, 59, 999))
    }
  });
  return `SAL-${date}-${(count + 1).toString().padStart(3, '0')}`;
};

const resolveProductCategory = async (item) => {
  if (item.category) {
    return item.category;
  }

  if (item.productId && mongoose.isValidObjectId(String(item.productId))) {
    const product = await Product.findById(item.productId).select('category').lean();
    if (product?.category) {
      return product.category;
    }
  }

  if (item.name) {
    const product = await Product.findOne({
      name: { $regex: `^${escapeRegex(item.name)}$`, $options: 'i' }
    }).select('category').lean();
    if (product?.category) {
      return product.category;
    }
  }

  return 'Uncategorized';
};

const normalizeSaleItems = async (items = []) => Promise.all(
  (Array.isArray(items) ? items : []).map(async (item) => {
    const quantity = Number(item.quantity || 1);
    const price = Number(item.price || 0);
    const total = item.total !== undefined ? Number(item.total) : quantity * price;

    const product = await Product.findById(item.productId).lean();
    const costPrice = product ? product.costPrice : (item.costPrice || 0);

    return {
      productId: item.productId,
      name: item.name || 'Unnamed Product',
      quantity,
      price,
      costPrice,
      total,
      category: await resolveProductCategory(item)
    };
  })
);

// Create a new sale
exports.createSale = async (req, res) => {
  try {
    const { items, totalAmount, tax, discount, paymentMethod, processedBy, paymentStatus, amountPaid, dueDate, customerId } = req.body;
    const normalizedItems = await normalizeSaleItems(items);

    if (!normalizedItems.length) {
      return errorResponse(res, 'At least one sale item is required', 400);
    }

    const saleNumber = await generateSaleNumber();
    const computedTotalAmount = totalAmount !== undefined
      ? Number(totalAmount)
      : normalizedItems.reduce((sum, item) => sum + item.total, 0);
    const paidAmount = amountPaid !== undefined ? Number(amountPaid) : computedTotalAmount;
    const amountDue = computedTotalAmount - paidAmount;

    // Update inventory
    for (const item of normalizedItems) {
      if (item.productId) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: -item.quantity }
        });
      }
    }

    // CRM+ Integration: Loyalty Points & Wallet
    if (customerId) {
        const customer = await Customer.findOne({ id: customerId });
        if (customer) {
            // Accrue Loyalty Points (1 point per Rs 100)
            const pointsEarned = Math.floor(computedTotalAmount / 100);
            customer.loyaltyPoints += pointsEarned;
            
            // Handle Wallet Payment
            if (paymentMethod === 'Wallet') {
                const totalAvailable = (customer.walletBalance || 0) + (customer.creditLimit || 0);
                if (totalAvailable < computedTotalAmount) {
                  return errorResponse(res, 'Insufficient wallet balance/credit limit', 400);
                }
                customer.walletBalance -= computedTotalAmount;
            }
            
            customer.totalSpent += computedTotalAmount;
            customer.totalOrders += 1;
            customer.lastOrderDate = new Date();
            await customer.save();
        }
    }

    const newSale = new Sale({
      saleNumber,
      items: normalizedItems,
      totalAmount: computedTotalAmount,
      tax,
      discount,
      paymentMethod,
      processedBy: processedBy || 'System',
      timestamp: new Date(),
      paymentStatus: paymentStatus || 'Paid',
      amountPaid: paidAmount,
      amountDue: amountDue,
      dueDate: dueDate || null,
      customerId: customerId || null
    });

    const savedSale = await newSale.save();

    // Record Transaction
    try {
      const transactionController = require('./transaction.controller');
      await transactionController.recordTransaction({
        type: 'Sale',
        amount: computedTotalAmount,
        paymentMethod: paymentMethod,
        status: 'Completed',
        referenceId: savedSale._id,
        referenceModel: 'Sale',
        customerId: customerId || null,
        processedBy: processedBy || 'System',
        description: `Sale ${saleNumber}`
      });
    } catch (txnError) {
      console.error('Failed to record transaction for sale:', txnError);
      // We don't fail the sale if transaction recording fails, but we log it
    }

    return successResponse(res, savedSale, 'Sale created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create sale', 400, error);
  }
};

// Get all sales (with simple filtering)
exports.getSales = async (req, res) => {
  try {
    const { startDate, endDate, staff, paymentStatus, paymentMethod, category, product, search } = req.query;
    let query = {};

    if (startDate && endDate) {
      query.timestamp = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (staff) {
      query.processedBy = staff;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (search) {
      query.$or = [
        { saleNumber: { $regex: escapeRegex(search), $options: 'i' } },
        { processedBy: { $regex: escapeRegex(search), $options: 'i' } }
      ];
    }

    const itemMatch = {};
    if (category) {
      itemMatch.category = { $regex: `^${escapeRegex(category)}$`, $options: 'i' };
    }
    if (product) {
      itemMatch.name = { $regex: escapeRegex(product), $options: 'i' };
    }
    if (Object.keys(itemMatch).length) {
      query.items = { $elemMatch: itemMatch };
    }

    const sales = await Sale.find(query).sort({ timestamp: -1 });
    return successResponse(res, sales, 'Sales retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve sales', 500, error);
  }
};

exports.getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.isValidObjectId(id)
      ? { $or: [{ _id: id }, { saleNumber: id }] }
      : { saleNumber: id };

    const sale = await Sale.findOne(query);
    if (!sale) {
      return errorResponse(res, 'Sale not found', 404);
    }

    return successResponse(res, sale, 'Sale retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve sale', 500, error);
  }
};

// Get sales report/stats
exports.getSalesReport = async (req, res) => {
  try {
    const stats = await Sale.aggregate([
      {
        $group: {
          _id: "$processedBy",
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" }
        }
      },
      {
        $project: {
          staffName: "$_id",
          totalSales: 1,
          totalRevenue: 1,
          _id: 0
        }
      }
    ]);

    const overall = await Sale.aggregate([
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" }
        }
      }
    ]);

    return successResponse(res, {
      byStaff: stats,
      overall: overall[0] || { totalTransactions: 0, totalRevenue: 0 }
    }, 'Sales report retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve sales report', 500, error);
  }
};
// Get general sales stats for dashboard
exports.getSalesStats = async (req, res) => {
  try {
    // Stats by day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const salesByDay = await Sale.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          revenue: { $sum: "$totalAmount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Stats by category
    const salesByCategory = await Sale.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: { $ifNull: ["$items.category", "Uncategorized"] },
          value: { $sum: "$items.total" }
        }
      }
    ]);

    const overall = await Sale.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    return successResponse(res, {
      byDay: salesByDay,
      byCategory: salesByCategory,
      summary: overall[0] || { totalOrders: 0, totalRevenue: 0 }
    }, 'Sales stats retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve sales stats', 500, error);
  }
};

// Get detailed daily report list
exports.getDailyReport = async (req, res) => {
  try {
    const { startDate, endDate, category, product, productId, paymentMethod, processedBy } = req.query;
    const saleQuery = {};

    if (startDate || endDate) {
      saleQuery.timestamp = {};
      if (startDate) saleQuery.timestamp.$gte = new Date(startDate);
      if (endDate) saleQuery.timestamp.$lte = new Date(endDate);
    }

    if (paymentMethod) {
      saleQuery.paymentMethod = paymentMethod;
    }

    if (processedBy) {
      saleQuery.processedBy = processedBy;
    }

    const sales = await Sale.find(saleQuery).sort({ timestamp: -1 }).lean();
    const reportMap = new Map();

    sales.forEach((sale) => {
      const matchingItems = (sale.items || []).filter((item) => {
        const categoryMatch = !category || String(item.category || '').toLowerCase() === String(category).toLowerCase();
        const productMatch = !product || String(item.name || '').toLowerCase().includes(String(product).toLowerCase());
        const productIdMatch = !productId || String(item.productId) === String(productId);
        return categoryMatch && productMatch && productIdMatch;
      });

      if (!matchingItems.length) {
        return;
      }

      const dayKey = new Date(sale.timestamp).toISOString().slice(0, 10);
      const matchedRevenue = matchingItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
      const taxRatio = sale.totalAmount ? matchedRevenue / sale.totalAmount : 0;
      const matchedTax = Number(sale.tax || 0) * taxRatio;

      if (!reportMap.has(dayKey)) {
        reportMap.set(dayKey, {
          _id: dayKey,
          orders: 0,
          revenue: 0,
          taxable: 0,
          gst: 0,
          profit: 0
        });
      }

      const bucket = reportMap.get(dayKey);
      bucket.orders += 1;
      bucket.revenue += matchedRevenue;
      bucket.taxable += matchedRevenue;
      bucket.gst += matchedTax;
      bucket.profit += matchedRevenue - matchedTax;
    });

    const report = Array.from(reportMap.values()).sort((a, b) => b._id.localeCompare(a._id));
    return successResponse(res, report, 'Daily report retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve daily report', 500, error);
  }
};
