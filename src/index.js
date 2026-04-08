const path = require('path');
const nodeEnv = process.env.NODE_ENV || 'local';
const envPath = path.join(__dirname, `../.env.${nodeEnv}`);

// Load the environment-specific file if it exists, otherwise fall back to .env
require('dotenv').config({
  path: require('fs').existsSync(envPath) ? envPath : path.join(__dirname, '../.env')
});
const express = require('express');
const morgan = require('morgan');
const { connectPostgres } = require('./config/db.config');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger.config');

const app = express();


/* =======================
   ✅ CORS CONFIGURATION (RESTRICTED MANUAL)
======================= */
const cors = require("cors");

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests from your frontend origin
    const allowedOrigins = [
      'https://vyapar-pos-git-development-raismansuri74059-1745s-projects.vercel.app',
      'https://vyapar-pos.vercel.app',
      'http://localhost:3000', // For local development
      'http://localhost:4200'  // If you use Angular locally
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Skip-Loader', 'X-Skip-Error-Toast'],
}));

/* =======================
   ✅ DATABASE CONNECTION INITIALIZATION
======================= */
let isConnected = false;

async function startServer() {
  if (isConnected) return;
  try {
    await connectPostgres();
    isConnected = true;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

// Fire-and-forget initialization at startup to reduce cold-start latency
startServer().catch(err => console.error("Startup DB connection failed:", err));

// Middleware to ensure DB connection before processing requests
app.use(async (req, res, next) => {
  if (isConnected) return next();
  
  try {
    await startServer();
    next();
  } catch (error) {
    // Add CORS headers manually for the error response (especially for Vercel)
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
});

/* =======================
   ✅ MIDDLEWARE
======================= */
app.use(express.json());
app.use(morgan('dev'));

/* =======================
   ✅ ROOT ROUTE
======================= */
app.get('/', (req, res) => {
  res.send('POS Backend Running 🚀');
});

/* =======================
   ✅ HEALTH CHECK & BASE API
======================= */
app.get('/api', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Vyapar POS API is live',
    version: '1.0.0'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Backend server is running with PostgreSQL'
  });
});

/* =======================
   ✅ SWAGGER UI
======================= */
const swaggerOptions = {
  customCssUrl: "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css",
  customJs: [
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js",
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js",
  ],
};
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

/* =======================
   ✅ ROUTES
======================= */
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/sales', require('./routes/sale.routes'));
app.use('/api/products', require('./routes/product.routes'));
app.use('/api/customers', require('./routes/customer.routes'));
app.use('/api/tickets', require('./routes/ticket.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/expenses', require('./routes/expense.routes'));
app.use('/api/categories', require('./routes/category.routes'));
app.use('/api/reports', require('./routes/report.routes'));
app.use('/api/marketing', require('./routes/marketing.routes'));
app.use('/api/transactions', require('./routes/transaction.routes'));
app.use('/api/ai', require('./routes/ai.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/cart', require('./routes/cart.routes'));
app.use('/api/upload', require('./routes/upload.routes'));
app.use('/api/audit', require('./routes/audit.routes'));


/* =======================
   ✅ EXPORT APP
======================= */
module.exports = app;

/* =======================
   ✅ SERVER START (LOCAL)
======================= */
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    try {
      await startServer();
    } catch (err) {
      console.error('Failed to connect to database at startup:', err.message);
    }
  });
}

// Export startServer for the Vercel entry point
module.exports.startServer = startServer;
