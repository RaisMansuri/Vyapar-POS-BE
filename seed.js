const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./src/models/product.model');

dotenv.config();

const products = [
  // Breads
  { barcode: 'BRD001', name: 'Whole Wheat Bread', price: 50, costPrice: 35, stock: 20, category: 'Breads', description: 'Healthy whole wheat bread' },
  { barcode: 'BRD002', name: 'Garlic Bread sticks', price: 40, costPrice: 25, stock: 30, category: 'Breads', description: 'Freshly baked garlic bread' },
  { barcode: 'BRD003', name: 'Multigrain Loaf', price: 65, costPrice: 45, stock: 15, category: 'Breads', description: 'Power packed multigrain' },
  { barcode: 'BRD004', name: 'Sweet Bun (Pack of 4)', price: 30, costPrice: 20, stock: 50, category: 'Breads', description: 'Soft sweet buns' },
  { barcode: 'BRD005', name: 'Pizza Base (Twin Pack)', price: 45, costPrice: 30, stock: 25, category: 'Breads', description: 'Ready to bake pizza base' },
  
  // Pastries
  { barcode: 'PAS006', name: 'Pineapple Pastry', price: 60, costPrice: 40, stock: 12, category: 'Pastries', description: 'Juicy pineapple layers' },
  { barcode: 'PAS007', name: 'Black Forest Pastry', price: 70, costPrice: 45, stock: 10, category: 'Pastries', description: 'Classic chocolate and cherry' },
  { barcode: 'PAS008', name: 'Mango Delight Pastry', price: 75, costPrice: 50, stock: 8, category: 'Pastries', description: 'Seasonal mango cream' },
  { barcode: 'PAS009', name: 'Choco Lava Cake', price: 85, costPrice: 55, stock: 15, category: 'Pastries', description: 'Melting chocolate heart' },
  { barcode: 'PAS010', name: 'Strawberry Pastry', price: 65, costPrice: 42, stock: 12, category: 'Pastries', description: 'Sweet strawberry frosting' },

  // Cakes
  { barcode: 'CAK011', name: 'Vanilla Celebration Cake', price: 450, costPrice: 300, stock: 5, category: 'Cakes', description: 'Perfect for birthdays' },
  { barcode: 'CAK012', name: 'Dutch Truffle Cake', price: 550, costPrice: 380, stock: 4, category: 'Cakes', description: 'Rich dark chocolate' },
  { barcode: 'CAK013', name: 'Fruit Overload Cake', price: 600, costPrice: 420, stock: 3, category: 'Cakes', description: 'Loaded with fresh fruits' },
  { barcode: 'CAK014', name: 'Butterscotch Crunch', price: 480, costPrice: 320, stock: 6, category: 'Cakes', description: 'Crunchy butterscotch bits' },
  { barcode: 'CAK015', name: 'Red Velvet Royale', price: 700, costPrice: 480, stock: 2, category: 'Cakes', description: 'Premium red velvet' },

  // Drinks
  { barcode: 'DRK016', name: 'Iced Latte', price: 90, costPrice: 50, stock: 20, category: 'Drinks', description: 'Chilled coffee perfection' },
  { barcode: 'DRK017', name: 'Fresh Orange Juice', price: 120, costPrice: 70, stock: 15, category: 'Drinks', description: '100% natural orange' },
  { barcode: 'DRK018', name: 'Masala Tea', price: 40, costPrice: 15, stock: 100, category: 'Drinks', description: 'Indian spiced tea' },
  { barcode: 'DRK019', name: 'Lemon Iced Tea', price: 60, costPrice: 30, stock: 30, category: 'Drinks', description: 'Refreshing lemon tea' },
  { barcode: 'DRK020', name: 'Hot Chocolate', price: 110, costPrice: 60, stock: 15, category: 'Drinks', description: 'Creamy hot cocoa' },

  // Cookies
  { barcode: 'COK021', name: 'Choco Chip Cookies', price: 150, costPrice: 90, stock: 20, category: 'Cookies', description: 'Loaded with chocolate chips' },
  { barcode: 'COK022', name: 'Oatmeal Raisin', price: 140, costPrice: 85, stock: 15, category: 'Cookies', description: 'Healthy oat cookies' },
  { barcode: 'COK023', name: 'Pistachio Biscuits', price: 180, costPrice: 110, stock: 12, category: 'Cookies', description: 'Nutty pistachio flavor' },
  { barcode: 'COK024', name: 'Butter Cookies (Tin)', price: 250, costPrice: 160, stock: 10, category: 'Cookies', description: 'Rich Danish style butter cookies' },
  { barcode: 'COK025', name: 'Coconut Crunch', price: 130, costPrice: 80, stock: 25, category: 'Cookies', description: 'Toasted coconut bits' },

  // Savories
  { barcode: 'SAV026', name: 'Paneer Puff', price: 35, costPrice: 20, stock: 40, category: 'Savories', description: 'Paneer puff' },
  { barcode: 'SAV027', name: 'Chicken Puff', price: 45, costPrice: 25, stock: 35, category: 'Savories', description: 'Chicken puff' },
  { barcode: 'SAV028', name: 'Veg Burger', price: 60, costPrice: 35, stock: 20, category: 'Savories', description: 'Veg burger' },
  { barcode: 'SAV029', name: 'Veg Sandwich', price: 50, costPrice: 30, stock: 25, category: 'Savories', description: 'Veg sandwich' },
  { barcode: 'SAV030', name: 'Chicken Sandwich', price: 70, costPrice: 40, stock: 15, category: 'Savories', description: 'Chicken sandwich' },
];

async function seed() {
  try {
    console.log('Connecting to:', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    for (const p of products) {
        await Product.findOneAndUpdate({ barcode: p.barcode }, p, { upsert: true });
        console.log(`Upserted: ${p.name}`);
    }

    console.log('Seeding completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
