const Product = require('../models/product.model');
const { Op, Sequelize } = require('sequelize');
const { successResponse, errorResponse } = require('../utils/response');
const { recordAudit } = require('../services/audit.service');

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Create Product
exports.createProduct = async (req, res) => {
  try {
    const data = { ...req.body };
    console.log('Original Request Body:', JSON.stringify(req.body, null, 2));
    
    // Handle category object from frontend
    if (data.category && typeof data.category === 'object' && data.category.name) {
      console.log('Transforming category object to string:', data.category.name);
      data.category = data.category.name;
    }

    // Remove id if present (Sequelize will generate UUID)
    if (data.id) delete data.id;

    const product = await Product.create({ ...data, userId: req.user.id });
    
    // Record Audit
    await recordAudit({
      userId: req.user.id,
      action: 'CREATE_PRODUCT',
      entityType: 'Product',
      entityId: product.id,
      newValue: product.toJSON(),
      req
    });

    return successResponse(res, product, 'Product created successfully', 201);
  } catch (error) {
    console.error('--- PRODUCT CREATION ERROR ---');
    console.error('Error Message:', error.message);
    console.error('Request Data:', req.body);
    console.error('------------------------------');
    return errorResponse(res, 'Failed to create product', 400, error);
  }
};

// Get all Products
exports.getProducts = async (req, res) => {
  try {
    const { category, categoryId, search, barcode, lowStock } = req.query;
    const where = {};

    const resolvedCategory = category || categoryId;
    if (resolvedCategory) {
      where.category = { [Op.iLike]: resolvedCategory };
    }

    if (barcode) {
      where.barcode = barcode;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { category: { [Op.iLike]: `%${search}%` } },
        { barcode: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (lowStock === 'true') {
      where.stock = { [Op.lte]: Sequelize.col('minStockLevel') };
    }

    const products = await Product.findAll({
      where: { 
        ...where, 
        userId: {
          [Op.or]: [req.user.id, '00000000-0000-0000-0000-000000000000']
        }
      },
      order: [['createdAt', 'DESC']]
    });
    return successResponse(res, products, 'Products retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve products', 500, error);
  }
};

// Get Inventory Products
exports.getInventory = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { 
        userId: {
          [Op.or]: [req.user.id, '00000000-0000-0000-0000-000000000000']
        }
      },
      order: [['createdAt', 'DESC']]
    });
    return successResponse(res, products, 'Inventory products retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve inventory products', 500, error);
  }
};

// Get Product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({ 
      where: { id: req.params.id, userId: req.user.id } 
    });
    if (!product) return errorResponse(res, 'Product not found', 404);
    return successResponse(res, product, 'Product retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve product', 500, error);
  }
};

// Update Product
exports.updateProduct = async (req, res) => {
  try {
    const data = { ...req.body };
    console.log('--- PRODUCT UPDATE ATTEMPT ---');
    console.log('User ID:', req.user.id);
    console.log('Target Product ID (Params):', req.params.id);
    console.log('Update Data (Original):', JSON.stringify(req.body, null, 2));

    // Handle category object from frontend
    if (data.category && typeof data.category === 'object' && data.category.name) {
      console.log('Transforming category object to string:', data.category.name);
      data.category = data.category.name;
    }

    // Remove id from the data being updated! (Primary keys should not be updated)
    if (data.id) {
       console.log('Removing id from update payload:', data.id);
       delete data.id;
    }

    const product = await Product.findOne({ where: { id: req.params.id } });
    if (!product) {
      console.warn('Product ID not found in database:', req.params.id);
      return errorResponse(res, 'Product not found', 404);
    }

    if (product.userId !== req.user.id && product.userId !== '00000000-0000-0000-0000-000000000000') {
      console.warn('Ownership mismatch. Product user:', product.userId, 'Current user:', req.user.id);
      return errorResponse(res, 'Access denied. You do not own this product.', 403);
    }

    const oldValue = product.toJSON();
    const [updatedCount] = await Product.update(data, {
      where: { id: req.params.id }
    });

    if (updatedCount > 0) {
      const updatedProduct = await Product.findByPk(req.params.id);
      
      // Record Audit
      await recordAudit({
        userId: req.user.id,
        action: 'UPDATE_PRODUCT',
        entityType: 'Product',
        entityId: req.params.id,
        oldValue,
        newValue: updatedProduct.toJSON(),
        req
      });

      return successResponse(res, updatedProduct, 'Product updated successfully');
    }

    return successResponse(res, product, 'Product updated successfully (no changes)');
  } catch (error) {
    console.error('--- PRODUCT UPDATE ERROR ---');
    console.error('Error Message:', error.message);
    console.error('Stack Trace:', error.stack);
    console.error('----------------------------');
    return errorResponse(res, 'Failed to update product', 400, error);
  }
};

// Delete Product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!product) return errorResponse(res, 'Product not found', 404);
    
    const oldValue = product.toJSON();
    await Product.destroy({
      where: { id: req.params.id, userId: req.user.id }
    });

    // Record Audit
    await recordAudit({
      userId: req.user.id,
      action: 'DELETE_PRODUCT',
      entityType: 'Product',
      entityId: req.params.id,
      oldValue,
      req
    });

    return successResponse(res, null, 'Product deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete product', 500, error);
  }
};

// Get categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Product.findAll({
      attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('category')), 'category']],
      raw: true
    });
    const result = categories.map(c => c.category).filter(Boolean);
    return successResponse(res, result, 'Categories retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve categories', 500, error);
  }
};

// Get low stock products
exports.getLowStock = async (req, res) => {
  try {
    console.log(`[LowStock] Fetching for user: ${req.user?.id}`);
    
    // Use Sequelize.where for more reliable column-to-column comparison
    const products = await Product.findAll({
      where: {
        userId: req.user.id,
        [Op.and]: [
          Sequelize.where(
            Sequelize.col('stock'),
            Op.lte,
            Sequelize.col('minStockLevel')
          )
        ]
      }
    });

    console.log(`[LowStock] Found ${products.length} products`);
    return successResponse(res, products, 'Low stock products retrieved successfully');
  } catch (error) {
    console.error('--- LOW STOCK ERROR ---');
    console.error('Error Message:', error.message);
    console.error('Stack Trace:', error.stack);
    console.error('-----------------------');
    return errorResponse(res, 'Failed to retrieve low stock products', 500, error);
  }
};
