const { sequelize } = require('./src/config/db.config');
const User = require('./src/models/user.model');
const Product = require('./src/models/product.model');

const products = [
  // Breads
  { barcode: 'BRD001', name: 'Whole Wheat Bread', price: 50, costPrice: 35, stock: 20, category: 'Breads' },
  { barcode: 'BRD002', name: 'Garlic Bread sticks', price: 40, costPrice: 25, stock: 30, category: 'Breads' },
  { barcode: 'BRD003', name: 'Multigrain Loaf', price: 65, costPrice: 45, stock: 15, category: 'Breads' },
  { barcode: 'BRD004', name: 'Sweet Bun (Pack of 4)', price: 30, costPrice: 20, stock: 50, category: 'Breads' },
  { barcode: 'BRD005', name: 'Pizza Base (Twin Pack)', price: 45, costPrice: 30, stock: 25, category: 'Breads' },
  
  // Pastries
  { barcode: 'PAS006', name: 'Pineapple Pastry', price: 60, costPrice: 40, stock: 12, category: 'Pastries' },
  { barcode: 'PAS007', name: 'Black Forest Pastry', price: 70, costPrice: 45, stock: 10, category: 'Pastries' },
  { barcode: 'PAS008', name: 'Mango Delight Pastry', price: 75, costPrice: 50, stock: 8, category: 'Pastries' },
  { barcode: 'PAS009', name: 'Choco Lava Cake', price: 85, costPrice: 55, stock: 15, category: 'Pastries' },
  { barcode: 'PAS010', name: 'Strawberry Pastry', price: 65, costPrice: 42, stock: 12, category: 'Pastries' },

  // Cakes
  { barcode: 'CAK011', name: 'Vanilla Celebration Cake', price: 450, costPrice: 300, stock: 5, category: 'Cakes' },
  { barcode: 'CAK012', name: 'Dutch Truffle Cake', price: 550, costPrice: 380, stock: 4, category: 'Cakes' },
  { barcode: 'CAK013', name: 'Fruit Overload Cake', price: 600, costPrice: 420, stock: 3, category: 'Cakes' },
  { barcode: 'CAK014', name: 'Butterscotch Crunch', price: 480, costPrice: 320, stock: 6, category: 'Cakes' },
  { barcode: 'CAK015', name: 'Red Velvet Royale', price: 700, costPrice: 480, stock: 2, category: 'Cakes' },

  // Drinks
  { barcode: 'DRK016', name: 'Iced Latte', price: 90, costPrice: 50, stock: 20, category: 'Drinks' },
  { barcode: 'DRK017', name: 'Fresh Orange Juice', price: 120, costPrice: 70, stock: 15, category: 'Drinks' },
  { barcode: 'DRK018', name: 'Masala Tea', price: 40, costPrice: 15, stock: 100, category: 'Drinks' },
  { barcode: 'DRK019', name: 'Lemon Iced Tea', price: 60, costPrice: 30, stock: 30, category: 'Drinks' },
  { barcode: 'DRK020', name: 'Hot Chocolate', price: 110, costPrice: 60, stock: 15, category: 'Drinks' },

  // Cookies
  { barcode: 'COK021', name: 'Choco Chip Cookies', price: 150, costPrice: 90, stock: 20, category: 'Cookies' },
  { barcode: 'COK022', name: 'Oatmeal Raisin', price: 140, costPrice: 85, stock: 15, category: 'Cookies' },
  { barcode: 'COK023', name: 'Pistachio Biscuits', price: 180, costPrice: 110, stock: 12, category: 'Cookies' },
  { barcode: 'COK024', name: 'Butter Cookies (Tin)', price: 250, costPrice: 160, stock: 10, category: 'Cookies' },
  { barcode: 'COK025', name: 'Coconut Crunch', price: 130, costPrice: 80, stock: 25, category: 'Cookies' },

  // Savories
  { barcode: 'SAV026', name: 'Paneer Puff', price: 35, costPrice: 20, stock: 40, category: 'Savories' },
  { barcode: 'SAV027', name: 'Chicken Puff', price: 45, costPrice: 25, stock: 35, category: 'Savories' },
  { barcode: 'SAV028', name: 'Veg Burger', price: 60, costPrice: 35, stock: 20, category: 'Savories' },
  { barcode: 'SAV029', name: 'Veg Sandwich', price: 50, costPrice: 30, stock: 25, category: 'Savories' },
  { barcode: 'SAV030', name: 'Chicken Sandwich', price: 70, costPrice: 40, stock: 15, category: 'Savories' },
];

async function seed() {
  try {
    console.log('--- Database Seeding (PostgreSQL) ---');
    await sequelize.authenticate();
    console.log('Connected to PostgreSQL');

    // Sync models
    await sequelize.sync({ alter: true });
    console.log('Database schema synchronized');

    // Create default admin user if not exists
    let admin = await User.findOne({ where: { email: 'admin@vyaparpos.com' } });
    if (!admin) {
      admin = await User.create({
        name: 'Admin User',
        email: 'admin@vyaparpos.com',
        password: 'admin123@password', // Will be hashed by hook
        role: 'Admin',
        isVerified: true
      });
      console.log('Default admin user created');
    }

    // Seed products
    for (const p of products) {
      const [product, created] = await Product.findOrCreate({
        where: { barcode: p.barcode },
        defaults: {
          ...p,
          userId: admin.id
        }
      });
      
      if (created) {
        console.log(`Created: ${p.name}`);
      } else {
        await product.update({ ...p, userId: admin.id });
        console.log(`Updated: ${p.name}`);
      }
    }

    console.log('Seeding completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
