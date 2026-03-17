require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');

const app = express();

// Middleware
app.use(cors('https://vyapar-pos-git-development-raismansuri74059-1745s-projects.vercel.app'));
app.use(express.json());
app.use(morgan('dev'));

// Root route (IMPORTANT FIX)
app.get('/', (req, res) => {
  res.send('POS Backend Running 🚀');
});

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Backend server is running' });
});

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/sales', require('./routes/sale.routes'));
app.use('/api/products', require('./routes/product.routes'));
app.use('/api/customers', require('./routes/customer.routes'));
app.use('/api/tickets', require('./routes/ticket.routes'));

// MongoDB (IMPORTANT: connect once)
let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  const MONGODB_URI = process.env.MONGODB_URI;
  await mongoose.connect(MONGODB_URI);
  isConnected = true;
  console.log('MongoDB Connected');
}

// Export handler (THIS IS KEY)
module.exports = async (req, res) => {
  await connectDB();
  return app(req, res);
};