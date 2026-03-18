const Customer = require('../models/customer.model');
const { successResponse, errorResponse } = require('../utils/response');

// Create Customer
exports.createCustomer = async (req, res) => {
  try {
    // Basic ID generation if not provided
    if (!req.body.id) {
        const count = await Customer.countDocuments();
        req.body.id = `CUST-${(count + 1).toString().padStart(3, '0')}`;
    }
    const customer = new Customer(req.body);
    const savedCustomer = await customer.save();
    return successResponse(res, savedCustomer, 'Customer created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create customer', 400, error);
  }
};

// Get all Customers
exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    return successResponse(res, customers, 'Customers retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve customers', 500, error);
  }
};

// Get Customer by ID (using the custom string ID)
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findOne({ id: req.params.id });
    if (!customer) return errorResponse(res, 'Customer not found', 404);
    return successResponse(res, customer, 'Customer retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve customer', 500, error);
  }
};

// Update Customer
exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    if (!customer) return errorResponse(res, 'Customer not found', 404);
    return successResponse(res, customer, 'Customer updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update customer', 400, error);
  }
};

// Delete Customer
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete({ id: req.params.id });
    if (!customer) return errorResponse(res, 'Customer not found', 404);
    return successResponse(res, null, 'Customer deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete customer', 500, error);
  }
};
