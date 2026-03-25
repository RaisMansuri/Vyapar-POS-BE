const app = require('../src/index');

module.exports = async (req, res) => {
  try {
    // Ensure database is connected before handling the request
    if (app.startServer) {
      await app.startServer();
    }
    return app(req, res);
  } catch (error) {
    console.error('API Error:', error);
    
    // Add CORS headers to the error response
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.status(500).json({
      status: 'Error',
      message: 'Internal Server Error (Database Connection Failed)',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
