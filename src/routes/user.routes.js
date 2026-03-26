const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Protected routes (require login)
router.use(protect);

router.get('/me', userController.getCurrentUser);
router.put('/me', userController.updateCurrentUser);

// Admin only routes
router.post('/', authorize('admin'), userController.createUser);
router.get('/', authorize('admin'), userController.getUsers);
router.get('/:id', authorize('admin'), userController.getUserById);
router.put('/:id', authorize('admin'), userController.updateUser);
router.delete('/:id', authorize('admin'), userController.deleteUser);

module.exports = router;
