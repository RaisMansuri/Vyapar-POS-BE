const Product = require('../models/product.model');
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

    // Remove id: null if present (Mongoose will generate _id)
    if (data.id === null) delete data.id;

    const product = new Product(data);
    const savedProduct = await product.save();
    return successResponse(res, savedProduct, 'Product created successfully', 201);
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
    const query = {};

    const resolvedCategory = category || categoryId;
    if (resolvedCategory) {
      query.category = { $regex: `^${escapeRegex(resolvedCategory)}$`, $options: 'i' };
    }

    if (barcode) {
      query.barcode = barcode;
    }

    if (search) {
      query.$or = [
        { name: { $regex: escapeRegex(search), $options: 'i' } },
        { description: { $regex: escapeRegex(search), $options: 'i' } },
        { barcode: { $regex: escapeRegex(search), $options: 'i' } }
      ];
    }

    if (lowStock === 'true') {
      query.$expr = { $lte: ['$stock', '$minStockLevel'] };
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    return successResponse(res, products, 'Products retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve products', 500, error);
  }
};

// Get Product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
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

    const product = await Product.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!product) return errorResponse(res, 'Product not found', 404);
    return successResponse(res, product, 'Product updated successfully');
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
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return errorResponse(res, 'Product not found', 404);
    return successResponse(res, null, 'Product deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete product', 500, error);
  }
};

// Get categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    return successResponse(res, categories, 'Categories retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve categories', 500, error);
  }
};

// Get low stock products
exports.getLowStock = async (req, res) => {
  try {
    const products = await Product.find({
      $expr: { $lte: ["$stock", "$minStockLevel"] }
    });
    return successResponse(res, products, 'Low stock products retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve low stock products', 500, error);
  }
};
