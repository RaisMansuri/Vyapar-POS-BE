const User = require('../models/user.model');
const { successResponse, errorResponse } = require('../utils/response');

const sanitizeUser = (user) => ({
  id: user.id || user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isVerified: user.isVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, phone, role, isVerified } = req.body;

    if (!name || !email || !password) {
      return errorResponse(res, 'Name, email, and password are required', 400);
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return errorResponse(res, 'User already exists', 400);
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: role || 'Staff',
      isVerified: typeof isVerified === 'boolean' ? isVerified : true
    });

    return successResponse(res, sanitizeUser(user), 'User created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create user', 400, error);
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    const where = {};

    if (role) {
      where.role = role;
    }

    if (search) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    return successResponse(res, users, 'Users retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve users', 500, error);
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, user, 'User retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve user', 500, error);
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, email, password, phone, role, isVerified } = req.body;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return errorResponse(res, 'Email is already in use', 400);
      }
      user.email = email;
    }

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (role !== undefined) user.role = role;
    if (typeof isVerified === 'boolean') user.isVerified = isVerified;
    if (password) user.password = password;

    await user.save();

    return successResponse(res, sanitizeUser(user), 'User updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update user', 400, error);
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const deletedCount = await User.destroy({ where: { id: req.params.id } });
    if (deletedCount === 0) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, null, 'User deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete user', 500, error);
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, user, 'Current user retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve current user', 500, error);
  }
};

exports.updateCurrentUser = async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (password) user.password = password;

    await user.save();

    return successResponse(res, sanitizeUser(user), 'Current user updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update current user', 400, error);
  }
};
