const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

if (!process.env.POSTGRES_URL) {
  console.error('❌ FATAL: POSTGRES_URL is not defined in environment variables.');
  process.exit(1);
}

const sequelize = new Sequelize(process.env.POSTGRES_URL, {
  dialect: 'postgres',
  dialectModule: require('pg'),
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

const connectPostgres = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL Connected successfully with Sequelize.');
    
    // Synchronize models (development only)
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      console.log('Database synchronized.');
    }
  } catch (error) {
    console.error('PostgreSQL connection error:', error);
    throw error;
  }
};

module.exports = { sequelize, connectPostgres };
