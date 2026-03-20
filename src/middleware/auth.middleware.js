const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check if header exists
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authorization token missing or invalid format'
      });
    }

    // Extract token
    const token = authHeader.split(' ')[1];

    // Verify token (with fallback secret)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');

    // Attach user to request
    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message: 'Token is not valid',
      error: error.message
    });
  }
};

module.exports = authMiddleware;
module.exports.protect = authMiddleware;