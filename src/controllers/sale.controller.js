const Sale = require('../models/sale.model');
const Product = require('../models/product.model');
const Customer = require('../models/customer.model');
const { Op, Sequelize } = require('sequelize');
const { successResponse, errorResponse } = require('../utils/response');
const { sendEmail } = require('../utils/email');
const { getInvoiceEmailTemplate } = require('../utils/emailTemplates');
const { recordAudit } = require('../services/audit.service');

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Helper to generate a unique sale number
const generateSaleNumber = async (req) => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
  const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));

  const count = await Sale.count({
    where: {
      timestamp: {
        [Op.between]: [startOfDay, endOfDay]
      },
      userId: req.user.id
    }
  });
  return `SAL-${date}-${(count + 1).toString().padStart(3, '0')}`;
};

const resolveProductCategory = async (item, userId) => {
  if (item.category) {
    return item.category;
  }

  if (item.productId) {
    const product = await Product.findOne({
      where: { id: item.productId, userId },
      attributes: ['category'],
      raw: true
    });
    if (product?.category) {
      return product.category;
    }
  }

  if (item.name) {
    const product = await Product.findOne({
      where: { name: { [Op.iLike]: item.name }, userId },
      attributes: ['category'],
      raw: true
    });
    if (product?.category) {
      return product.category;
    }
  }

  return 'Uncategorized';
};

const normalizeSaleItems = async (items = [], userId) => Promise.all(
  (Array.isArray(items) ? items : []).map(async (item) => {
    const quantity = Number(item.quantity || 1);
    const price = Number(item.price || 0);
    const total = item.total !== undefined ? Number(item.total) : quantity * price;

    const product = await Product.findOne({ 
      where: { id: item.productId, userId },
      raw: true 
    });
    const costPrice = product ? product.costPrice : (item.costPrice || 0);

    return {
      productId: item.productId,
      product: {
        id: item.productId,
        name: item.name || 'Unnamed Product',
        imageUrl: product ? product.imageUrl : (item.imageUrl || ''),
        category: await resolveProductCategory(item, userId)
      },
      name: item.name || 'Unnamed Product',
      quantity,
      price,
      costPrice,
      gstRate: product ? (product.gstRate || 0) : 0,
      total,
      category: await resolveProductCategory(item, userId)
    };
  })
);

// Create a new sale
exports.createSale = async (req, res) => {
  try {
    const { 
      items, customerId, paymentMethod, tax, discount, totalAmount, amountPaid, 
      processedBy, paymentStatus, dueDate, address,
      subTotal, deliveryFee, cgst, sgst, igst
    } = req.body;
    
    // Normalize paymentMethod for Enum validation
    let normalizedPaymentMethod = paymentMethod;
    if (paymentMethod && typeof paymentMethod === 'string') {
        const pm = paymentMethod.toLowerCase();
        if (pm === 'upi') normalizedPaymentMethod = 'UPI';
        else if (pm === 'cash') normalizedPaymentMethod = 'Cash';
        else if (pm === 'card') normalizedPaymentMethod = 'Card';
        else normalizedPaymentMethod = 'Cash'; // Default fallback
    } else {
        normalizedPaymentMethod = 'Cash'; // Default fallback
    }

    const normalizedItems = await normalizeSaleItems(items, req.user.id);

    if (!normalizedItems.length) {
      return errorResponse(res, 'At least one sale item is required', 400);
    }

    const saleNumber = await generateSaleNumber(req);
    const computedTotalAmount = totalAmount !== undefined
      ? Number(totalAmount)
      : normalizedItems.reduce((sum, item) => sum + item.total, 0);
    
    // Auto-calculate tax if not provided
    const computedTax = tax !== undefined 
      ? Number(tax) 
      : normalizedItems.reduce((sum, item) => sum + (item.total * (item.gstRate || 0) / 100), 0);

    const paidAmount = amountPaid !== undefined ? Number(amountPaid) : computedTotalAmount;
    const amountDue = computedTotalAmount - paidAmount;

    // Update inventory
    for (const item of normalizedItems) {
      if (item.productId) {
        await Product.decrement({ stock: item.quantity }, {
          where: { id: item.productId, userId: req.user.id }
        });
      }
    }

    // CRM+ Integration: Loyalty Points
    if (customerId) {
        const customer = await Customer.findOne({ 
          where: { id: customerId, userId: req.user.id } 
        });
        if (customer) {
            // Accrue Loyalty Points (1 point per Rs 100)
            const pointsEarned = Math.floor(computedTotalAmount / 100);
            customer.loyaltyPoints += pointsEarned;
            
            customer.totalSpent = Number(customer.totalSpent) + computedTotalAmount;
            customer.totalOrders += 1;
            customer.lastOrderDate = new Date();
            await customer.save();
        }
    }

    // Associate with customer if provided or if user is a consumer
    let customerIdToSave = customerId;
    if (!customerIdToSave && req.user && (req.user.role || '').toLowerCase() === 'consumer') {
      customerIdToSave = req.user.id;
    }

    if (customerIdToSave) {
      try {
        const customer = await Customer.findOne({ where: { id: customerIdToSave, userId: req.user.id } });
        if (customer) {
          customer.totalOrders += 1;
          customer.lastOrderDate = new Date();
          await customer.save();
        }
      } catch (custError) {
        console.error('Customer update failed during sale:', custError);
      }
    }

    const savedSale = await Sale.create({
      saleNumber,
      items: normalizedItems,
      totalAmount: computedTotalAmount,
      tax: computedTax,
      discount,
      paymentMethod: normalizedPaymentMethod,
      processedBy: processedBy || 'System',
      timestamp: new Date(),
      paymentStatus: paymentStatus || 'Paid',
      amountPaid: paidAmount,
      amountDue: amountDue,
      dueDate: dueDate || null,
      address: address || null,
      userId: req.user.id,
      customerId: customerIdToSave,
      subTotal: subTotal || (computedTotalAmount - (tax || 0)),
      deliveryFee: deliveryFee || 0,
      cgst: cgst || 0,
      sgst: sgst || 0,
      igst: igst || 0
    });

    // Record Audit
    await recordAudit({
      userId: req.user.id,
      action: 'CREATE_SALE',
      entityType: 'Sale',
      entityId: savedSale.id,
      newValue: savedSale.toJSON(),
      req
    });

    // Record Transaction
    try {
      const transactionController = require('./transaction.controller');
      await transactionController.recordTransaction({
        type: 'Sale',
        amount: computedTotalAmount,
        paymentMethod: normalizedPaymentMethod,
        status: 'Completed',
        referenceId: savedSale.id,
        referenceModel: 'Sale',
        customerId: customerId || null,
        processedBy: processedBy || 'System',
        description: `Sale ${saleNumber}`,
        userId: req.user.id
      });
    } catch (txnError) {
      console.error('Failed to record transaction for sale:', txnError);
    }

    return successResponse(res, savedSale, 'Sale created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create sale', 400, error);
  }
};

// Get all sales
exports.getSales = async (req, res) => {
  try {
    const { startDate, endDate, staff, paymentStatus, paymentMethod, category, product, search } = req.query;
    const where = {
      [Op.or]: [
        { userId: req.user.id },
        { customerId: req.user.id }
      ]
    };

    if (startDate && endDate) {
      where.timestamp = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }
    if (staff) {
      where.processedBy = staff;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (search) {
      where[Op.or] = [
        { saleNumber: { [Op.iLike]: `%${search}%` } },
        { processedBy: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // JSONB filtering for Postgres - combined to avoid overwriting
    const itemFilter = {};
    if (category) itemFilter.category = category;
    if (product) itemFilter.name = product;
    
    if (Object.keys(itemFilter).length > 0) {
        where.items = {
            [Op.contains]: [itemFilter]
        };
    }

    const sales = await Sale.findAll({
      where,
      order: [['timestamp', 'DESC']]
    });

    const transformedSales = sales.map(sale => {
      const saleObj = sale.toJSON();
      saleObj.items = (saleObj.items || []).map(item => {
        if (!item.product) {
          item.product = {
            id: item.productId,
            name: item.name,
            imageUrl: item.imageUrl || '',
            category: item.category
          };
        }
        return item;
      });
      return saleObj;
    });

    return successResponse(res, transformedSales, 'Sales retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve sales', 500, error);
  }
};

exports.getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if UUID or saleNumber
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    const queryWhere = isUUID 
      ? { [Op.or]: [{ id }, { saleNumber: id }] }
      : { saleNumber: id };

    const sale = await Sale.findOne({ 
      where: { 
        ...queryWhere, 
        [Op.or]: [
          { userId: req.user.id },
          { customerId: req.user.id }
        ]
      } 
    });
    if (!sale) {
      return errorResponse(res, 'Sale not found', 404);
    }

    const saleObj = sale.toJSON();
    saleObj.items = (saleObj.items || []).map(item => {
      if (!item.product) {
        item.product = {
          id: item.productId,
          name: item.name,
          imageUrl: item.imageUrl || '',
          category: item.category
        };
      }
      return item;
    });

    return successResponse(res, saleObj, 'Sale retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve sale', 500, error);
  }
};

// Get sales report/stats
exports.getSalesReport = async (req, res) => {
  try {
    const stats = await Sale.findAll({
      attributes: [
        ['processedBy', 'staffName'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalSales'],
        [Sequelize.fn('SUM', Sequelize.col('totalAmount')), 'totalRevenue']
      ],
      where: { userId: req.user.id },
      group: ['processedBy'],
      raw: true
    });

    const overall = await Sale.findOne({
      where: { userId: req.user.id },
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalTransactions'],
        [Sequelize.fn('SUM', Sequelize.col('totalAmount')), 'totalRevenue']
      ],
      raw: true
    });

    return successResponse(res, {
      byStaff: stats,
      overall: overall || { totalTransactions: 0, totalRevenue: 0 }
    }, 'Sales report retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve sales report', 500, error);
  }
};

// Get general sales stats for dashboard
exports.getSalesStats = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const where = {
      timestamp: { [Op.gte]: sevenDaysAgo },
      [Op.or]: [
        { userId: req.user.id },
        { customerId: req.user.id }
      ]
    };
    
    const salesByDay = await Sale.findAll({
      where,
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('timestamp')), 'day'],
        [Sequelize.fn('SUM', Sequelize.col('totalAmount')), 'revenue'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: [Sequelize.fn('DATE', Sequelize.col('timestamp'))],
      order: [[Sequelize.fn('DATE', Sequelize.col('timestamp')), 'ASC']],
      raw: true
    });

    // Stats by category - Special handling for JSONB array
    // This is more complex in Postgres/Sequelize without raw query
    // We fetch and aggregate in JS for simplicity or use a raw query
    const allSales = await Sale.findAll({
      where: { userId: req.user.id },
      attributes: ['items'],
      raw: true
    });

    const categoryStats = {};
    allSales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const cat = item.category || 'Uncategorized';
        categoryStats[cat] = (categoryStats[cat] || 0) + Number(item.total || 0);
      });
    });

    const salesByCategory = Object.entries(categoryStats).map(([name, value]) => ({ _id: name, value }));

    const overall = await Sale.findOne({
      where: { userId: req.user.id },
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalOrders'],
        [Sequelize.fn('SUM', Sequelize.col('totalAmount')), 'totalRevenue']
      ],
      raw: true
    });

    // Today's Profit calculation
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todaySales = await Sale.findAll({
      where: {
        userId: req.user.id,
        timestamp: { [Op.gte]: startOfToday }
      },
      raw: true
    });

    let todayProfit = 0;
    todaySales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const profitPerItem = (Number(item.price || 0) - Number(item.costPrice || 0)) * Number(item.quantity || 1);
        todayProfit += profitPerItem;
      });
    });

    return successResponse(res, {
      byDay: salesByDay.map(d => ({ _id: d.day, revenue: d.revenue, count: d.count })),
      byCategory: salesByCategory,
      summary: overall ? { 
        ...overall, 
        todayProfit 
      } : { totalOrders: 0, totalRevenue: 0, todayProfit: 0 }
    }, 'Sales stats retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve sales stats', 500, error);
  }
};

// Get detailed daily report list
exports.getDailyReport = async (req, res) => {
  try {
    const { startDate, endDate, category, product, productId, paymentMethod, processedBy } = req.query;
    const where = { userId: req.user.id };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp[Op.gte] = new Date(startDate);
      if (endDate) where.timestamp[Op.lte] = new Date(endDate);
    }

    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (processedBy) where.processedBy = processedBy;

    const sales = await Sale.findAll({
      where,
      order: [['timestamp', 'DESC']],
      raw: true
    });

    const reportMap = new Map();

    sales.forEach((sale) => {
      const matchingItems = (sale.items || []).filter((item) => {
        const categoryMatch = !category || String(item.category || '').toLowerCase() === String(category).toLowerCase();
        const productMatch = !product || String(item.name || '').toLowerCase().includes(String(product).toLowerCase());
        const prodIdMatch = !productId || String(item.productId) === String(productId);
        return categoryMatch && productMatch && prodIdMatch;
      });

      if (!matchingItems.length) return;

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

/**
 * Send invoice to customer (Email & SMS)
 */
exports.sendInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, phone } = req.body;

    if (!email && !phone) {
      return errorResponse(res, 'Email or Phone is required', 400);
    }

    const sale = await Sale.findOne({
      where: { id, userId: req.user.id }
    });

    if (!sale) {
      return errorResponse(res, 'Order not found', 404);
    }

    const saleObj = sale.toJSON();
    saleObj.items = (saleObj.items || []).map(item => {
      if (!item.product) {
        item.product = {
          id: item.productId,
          name: item.name || 'Unnamed Product',
          imageUrl: item.imageUrl || '',
          category: item.category || 'Uncategorized',
          price: item.price || 0
        };
      }
      return item;
    });

    const invoiceNumber = 'INV-' + (sale.saleNumber || sale.id).replace('ORD-', '');
    const results = [];

    // 1. Handle Email
    if (email) {
      const emailHtml = getInvoiceEmailTemplate(saleObj, invoiceNumber);
      try {
        await sendEmail(email, `Invoice ${invoiceNumber} from Vyapar POS`, emailHtml);
        results.push({ type: 'Email', status: 'Sent', destination: email });
      } catch (err) {
        console.error('Failed to send invoice email:', err);
        results.push({ type: 'Email', status: 'Failed', error: err.message });
      }
    }

    // 2. Handle SMS (Simulated)
    if (phone) {
      console.log('\n--------------------------------------------------');
      console.log('MOCK SMS GATEWAY: SENDING INVOICE');
      console.log('To:', phone);
      console.log('Message: Your invoice', invoiceNumber, 'for ₹' + sale.totalAmount, 'is ready. View at: https://vyaparpos.com/inv/' + sale.id);
      console.log('--------------------------------------------------\n');
      results.push({ type: 'SMS', status: 'Sent (Simulated)', destination: phone });
    }

    return successResponse(res, results, 'Invoice delivery handled');
  } catch (error) {
    console.error('Invoice sending error:', error);
    return errorResponse(res, 'Failed to process invoice delivery', 500, error);
  }
};
