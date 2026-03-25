const app = require('../src/index');

const allowedOrigins = [
  "http://localhost:4200",
  "https://vyapar-pos-git-development-raismansuri74059-1745s-projects.vercel.app"
];

module.exports = async (req, res) => {
  // 1. Explicitly handle CORS preflight (OPTIONS) requests
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else if (!origin) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Skip-Error-Toast, X-Skip-Loader, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version');
    return res.status(204).end();
  }

  try {
    // 2. Ensure database is connected before handling the request
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
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Skip-Error-Toast, X-Skip-Loader, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version');
    }

    res.status(500).json({
      status: 'Error',
      message: 'Internal Server Error (Database Connection Failed)',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
