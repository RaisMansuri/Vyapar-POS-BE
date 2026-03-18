const Sale = require('../models/sale.model');
const { successResponse, errorResponse } = require('../utils/response');

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

// Create a new sale
exports.createSale = async (req, res) => {
  try {
    const { items, totalAmount, tax, discount, paymentMethod, processedBy, paymentStatus, amountPaid, dueDate } = req.body;
    
    const saleNumber = await generateSaleNumber();
    
    const amountDue = totalAmount - (amountPaid || 0);

    const newSale = new Sale({
      saleNumber,
      items,
      totalAmount,
      tax,
      discount,
      paymentMethod,
      processedBy,
      timestamp: new Date(),
      paymentStatus: paymentStatus || 'Paid',
      amountPaid: amountPaid || totalAmount,
      amountDue: amountDue,
      dueDate: dueDate || null
    });

    const savedSale = await newSale.save();
    return successResponse(res, savedSale, 'Sale created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create sale', 400, error);
  }
};

// Get all sales (with simple filtering)
exports.getSales = async (req, res) => {
  try {
    const { startDate, endDate, staff } = req.query;
    let query = {};

    if (startDate && endDate) {
      query.timestamp = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (staff) {
      query.processedBy = staff;
    }

    const sales = await Sale.find(query).sort({ timestamp: -1 });
    return successResponse(res, sales, 'Sales retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve sales', 500, error);
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
          _id: "$items.category", // Note: Ensure category is passed in items or look up from Product
          value: { $sum: "$items.total" }
        }
      }
    ]);

    return successResponse(res, {
      byDay: salesByDay,
      byCategory: salesByCategory
    }, 'Sales stats retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve sales stats', 500, error);
  }
};

// Get detailed daily report list
exports.getDailyReport = async (req, res) => {
  try {
    const report = await Sale.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          orders: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
          taxable: { $sum: "$totalAmount" }, // Simple approximation if not stored separately
          gst: { $sum: "$tax" },
          profit: { $sum: { $subtract: ["$totalAmount", "$tax"] } } // Placeholder logic
        }
      },
      { $sort: { "_id": -1 } }
    ]);
    return successResponse(res, report, 'Daily report retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve daily report', 500, error);
  }
};
