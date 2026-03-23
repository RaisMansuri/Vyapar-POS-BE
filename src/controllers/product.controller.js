const Product = require('../models/product.model');
const { Op, Sequelize } = require('sequelize');
const { successResponse, errorResponse } = require('../utils/response');

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
      where,
      order: [['createdAt', 'DESC']]
    });
    return successResponse(res, products, 'Products retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve products', 500, error);
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

    // Handle category object from frontend
    if (data.category && typeof data.category === 'object' && data.category.name) {
      data.category = data.category.name;
    }

    const [updatedCount] = await Product.update(data, {
      where: { id: req.params.id, userId: req.user.id }
    });

    if (updatedCount === 0) return errorResponse(res, 'Product not found', 404);
    
    const updatedProduct = await Product.findOne({ 
      where: { id: req.params.id, userId: req.user.id } 
    });
    return successResponse(res, updatedProduct, 'Product updated successfully');
  } catch (error) {
    console.error('--- PRODUCT UPDATE ERROR ---');
    console.error('Error Message:', error.message);
    console.error('----------------------------');
    return errorResponse(res, 'Failed to update product', 400, error);
  }
};

// Delete Product
exports.deleteProduct = async (req, res) => {
  try {
    const deletedCount = await Product.destroy({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (deletedCount === 0) return errorResponse(res, 'Product not found', 404);
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
    const products = await Product.findAll({
      where: {
        stock: { [Op.lte]: Sequelize.col('minStockLevel') },
        userId: req.user.id
      }
    });
    return successResponse(res, products, 'Low stock products retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve low stock products', 500, error);
  }
};
