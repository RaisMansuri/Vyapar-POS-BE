const Customer = require('../models/customer.model');
const { successResponse, errorResponse } = require('../utils/response');

// Create Customer
exports.createCustomer = async (req, res) => {
  try {
    const customer = await Customer.create({ ...req.body, userId: req.user.id });
    return successResponse(res, customer, 'Customer created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create customer', 400, error);
  }
};

// Get all Customers
exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.findAll({ 
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']] 
    });
    return successResponse(res, customers, 'Customers retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve customers', 500, error);
  }
};

// Get Customer by ID
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findOne({ 
      where: { id: req.params.id, userId: req.user.id } 
    });
    if (!customer) return errorResponse(res, 'Customer not found', 404);
    return successResponse(res, customer, 'Customer retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve customer', 500, error);
  }
};

// Update Customer
exports.updateCustomer = async (req, res) => {
  try {
    const [updatedCount] = await Customer.update(req.body, {
      where: { id: req.params.id, userId: req.user.id }
    });
    if (updatedCount === 0) return errorResponse(res, 'Customer not found', 404);
    const updatedCustomer = await Customer.findOne({ 
      where: { id: req.params.id, userId: req.user.id } 
    });
    return successResponse(res, updatedCustomer, 'Customer updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update customer', 400, error);
  }
};

// Delete Customer
exports.deleteCustomer = async (req, res) => {
  try {
    const deletedCount = await Customer.destroy({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (deletedCount === 0) return errorResponse(res, 'Customer not found', 404);
    return successResponse(res, null, 'Customer deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete customer', 500, error);
  }
};
