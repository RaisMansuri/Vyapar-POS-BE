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

/**
 * Middleware to restrict access based on user roles
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userRole = (req.user.role || 'guest').toLowerCase();

    // Super Admin and Owner always have access
    if (userRole === 'superadmin' || userRole === 'owner') {
      return next();
    }

    if (roles.length > 0 && !roles.includes(userRole)) {
      return res.status(403).json({
        message: `Role (${userRole}) is not authorized to access this route`
      });
    }

    next();
  };
};

module.exports = authMiddleware;
module.exports.protect = authMiddleware;
module.exports.authorize = authorize;