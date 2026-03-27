const { Sequelize, Op } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, './.env') });

const sequelize = new Sequelize(process.env.POSTGRES_URL, {
  dialect: 'postgres',
  dialectModule: require('pg'),
  logging: true,
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }
  }
});

const Product = sequelize.define('Product', {
  stock: Sequelize.INTEGER,
  minStockLevel: Sequelize.INTEGER,
  userId: Sequelize.UUID
}, { timestamps: true });

async function testQuery() {
  console.log('--- Testing Low Stock Query ---');
  const start = Date.now();
  try {
    const products = await Product.findAll({
      where: {
        userId: 'c99e6e80-72de-4c4f-b430-3fbc9d523d24',
        [Op.and]: [
          Sequelize.where(
            Sequelize.col('stock'),
            Op.lte,
            Sequelize.col('minStockLevel')
          )
        ]
      }
    });
    console.log(`Success! Found ${products.length} products in ${Date.now() - start}ms`);
  } catch (err) {
    console.error('Query Failed:', err.message);
  } finally {
    process.exit();
  }
}

testQuery();
