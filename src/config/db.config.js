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

let connectionPromise = null;

const connectPostgres = async (retries = 3, delay = 2000) => {
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    for (let i = 0; i < retries; i++) {
      try {
        await sequelize.authenticate();
        console.log('PostgreSQL Connected successfully with Sequelize.');
        
        // Synchronize models (development only)
        if (process.env.NODE_ENV !== 'production') {
          await sequelize.sync({ alter: true });
          console.log('Database synchronized.');
        }
        return true;
      } catch (error) {
        console.error(`PostgreSQL connection attempt ${i + 1} failed:`, error.message);
        if (i === retries - 1) {
          connectionPromise = null; // Reset on final failure to allow retry later
          throw error;
        }
        await new Promise(res => setTimeout(res, delay));
      }
    }
  })();

  return connectionPromise;
};

module.exports = { sequelize, connectPostgres };
