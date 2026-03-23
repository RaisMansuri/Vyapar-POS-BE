const Category = require('../models/category.model');
const Product = require('../models/product.model');
const { successResponse, errorResponse } = require('../utils/response');

// Create Category
exports.createCategory = async (req, res) => {
  try {
    const category = await Category.create({ ...req.body, userId: req.user.id });
    return successResponse(res, category, 'Category created successfully', 201);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return errorResponse(res, 'Category name already exists', 400);
    }
    return errorResponse(res, 'Failed to create category', 400, error);
  }
};

// Get all Categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({ 
      where: { userId: req.user.id },
      order: [['name', 'ASC']] 
    });
    return successResponse(res, categories, 'Categories retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve categories', 500, error);
  }
};

// Get Category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findOne({ 
      where: { id: req.params.id, userId: req.user.id } 
    });
    if (!category) return errorResponse(res, 'Category not found', 404);
    return successResponse(res, category, 'Category retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve category', 500, error);
  }
};

// Update Category
exports.updateCategory = async (req, res) => {
  try {
    const oldCategory = await Category.findOne({ 
      where: { id: req.params.id, userId: req.user.id } 
    });
    if (!oldCategory) return errorResponse(res, 'Category not found', 404);

    const [updatedCount] = await Category.update(req.body, {
      where: { id: req.params.id, userId: req.user.id }
    });
    
    // If name changed, update all products in this category
    if (req.body.name && req.body.name !== oldCategory.name) {
        await Product.update({ category: req.body.name }, { 
            where: { category: oldCategory.name } 
        });
    }

    const updatedCategory = await Category.findOne({ 
      where: { id: req.params.id, userId: req.user.id } 
    });
    return successResponse(res, updatedCategory, 'Category updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update category', 400, error);
  }
};

// Delete Category
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findOne({ 
      where: { id: req.params.id, userId: req.user.id } 
    });
    if (!category) return errorResponse(res, 'Category not found', 404);

    // Optionally check if products are still in this category
    const productsCount = await Product.count({ 
        where: { category: category.name } 
    });
    if (productsCount > 0) {
        return errorResponse(res, `Cannot delete category while there are ${productsCount} products assigned to it.`, 400);
    }

    await Category.destroy({ where: { id: req.params.id, userId: req.user.id } });
    return successResponse(res, null, 'Category deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete category', 500, error);
  }
};
