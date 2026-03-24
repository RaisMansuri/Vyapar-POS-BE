const Cart = require('../models/cart.model');
const { successResponse, errorResponse } = require('../utils/response');

exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ where: { userId: req.user.id } });
    if (!cart) {
      cart = await Cart.create({ userId: req.user.id, items: [] });
    }
    return successResponse(res, cart.items, 'Cart retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve cart', 500, error);
  }
};

exports.updateCart = async (req, res) => {
  try {
    const { items } = req.body;
    let cart = await Cart.findOne({ where: { userId: req.user.id } });
    
    if (cart) {
      cart.items = items || [];
      await cart.save();
    } else {
      cart = await Cart.create({ userId: req.user.id, items: items || [] });
    }
    
    return successResponse(res, cart.items, 'Cart updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update cart', 500, error);
  }
};
