const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { connectPostgres } = require('./config/db.config');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger.config');

const app = express();


/* =======================
   ✅ CORS CONFIGURATION
======================= */
app.use(cors({
  origin: [
    'http://localhost:4200',
    'https://vyapar-pos-git-development-raismansuri74059-1745s-projects.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Skip-Loader']
}));


/* =======================
   ✅ MIDDLEWARE
======================= */
app.use(express.json());
app.use(morgan('dev'));

/* =======================
   ✅ ROOT ROUTE
======================= */
app.get('/', (req, res) => {
  res.send('POS Backend Running 🚀 (PostgreSQL Mode)');
});

/* =======================
   ✅ HEALTH CHECK
======================= */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Backend server is running with PostgreSQL'
  });
});

/* =======================
   ✅ SWAGGER UI
======================= */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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
   ✅ POSTGRESQL CONNECTION
======================= */
let isConnected = false;

async function startServer() {
  if (isConnected) return;

  try {
    await connectPostgres();
    isConnected = true;
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

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
    await startServer();
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

// Export startServer for the Vercel entry point
module.exports.startServer = startServer;
