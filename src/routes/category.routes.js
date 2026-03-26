const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

router.post('/', authorize('admin', 'manager', 'inventory_manager'), categoryController.createCategory);
router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategoryById);
router.put('/:id', authorize('admin', 'manager', 'inventory_manager'), categoryController.updateCategory);
router.delete('/:id', authorize('admin', 'manager', 'inventory_manager'), categoryController.deleteCategory);

module.exports = router;
