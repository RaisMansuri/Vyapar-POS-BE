const Product = require('../models/product.model');

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
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error('--- PRODUCT CREATION ERROR ---');
    console.error('Error Message:', error.message);
    console.error('Request Data:', req.body);
    console.error('------------------------------');
    res.status(400).json({ message: error.message });
  }
};

// Get all Products
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    console.error('--- PRODUCT UPDATE ERROR ---');
    console.error('Error Message:', error.message);
    console.error('----------------------------');
    res.status(400).json({ message: error.message });
  }
};

// Delete Product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get low stock products
exports.getLowStock = async (req, res) => {
  try {
    const products = await Product.find({
      $expr: { $lte: ["$stock", "$minStockLevel"] }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
