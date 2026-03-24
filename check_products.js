const Product = require('./src/models/product.model');
const { sequelize } = require('./src/config/db.config');

async function checkProducts() {
  try {
    await sequelize.authenticate();
    const products = await Product.findAll();
    console.log('Total products:', products.length);
    products.forEach(p => {
      console.log(`ID: ${p.id}, Name: ${p.name}, userId: ${p.userId}`);
    });
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkProducts();
