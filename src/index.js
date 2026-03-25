const path = require('path');
const nodeEnv = process.env.NODE_ENV || 'local';
const envPath = path.join(__dirname, `../.env.${nodeEnv}`);

// Load the environment-specific file if it exists, otherwise fall back to .env
require('dotenv').config({
  path: require('fs').existsSync(envPath) ? envPath : path.join(__dirname, '../.env')
});
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { connectPostgres } = require('./config/db.config');
// const swaggerUi = require('swagger-ui-express');
// const swaggerSpec = require('./config/swagger.config');

const app = express();


/* =======================
   ✅ CORS CONFIGURATION (ROBUST MANUAL)
======================= */
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Always allow the origin by echoing it back
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Skip-Error-Toast, X-Skip-Loader, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version');

  // Handle preflight (OPTIONS) requests immediately
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
});


/* =======================
   ✅ DATABASE CONNECTION MIDDLEWARE
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

// Middleware to ensure DB connection before processing requests
app.use(async (req, res, next) => {
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
   ✅ SWAGGER UI (DISABLED)
======================= */
/*
const swaggerOptions = {
  customCssUrl: "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css",
  customJs: [
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js",
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js",
  ],
};
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));
*/

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


/* =======================
   ✅ EXPORT APP
======================= */
module.exports = app;

/* =======================
   ✅ SERVER START (LOCAL)
======================= */
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    // Database will connect on the first request via middleware
  });
}
