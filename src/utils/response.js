/**
 * Standard API Response Utility
 */

const sendResponse = (res, statusCode, success, message, data = null, error = null) => {
  return res.status(statusCode).json({
    success,
    message,
    data,
    error: error ? (error.message || error) : null
  });
};

const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return sendResponse(res, statusCode, true, message, data);
};

const errorResponse = (res, message = 'Internal Server Error', statusCode = 500, error = null) => {
  return sendResponse(res, statusCode, false, message, null, error);
};

module.exports = {
  successResponse,
  errorResponse
};
