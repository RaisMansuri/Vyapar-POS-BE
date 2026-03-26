require('dotenv').config();
const { Sequelize } = require('sequelize');
const path = require('path');

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

async function debug() {
  try {
    await sequelize.authenticate();
    console.log('Connected.');
    const [results] = await sequelize.query('SELECT version();');
    console.log('Postgres Version:', results[0].version);
    
    console.log('Attempting to show indices for Sales...');
    const indices = await sequelize.getQueryInterface().showIndex('Sales');
    console.log(`Found ${indices.length} indices.`);
    
    const duplicateSaleNumbers = indices.filter(i => i.name.includes('saleNumber'));
    console.log(`Found ${duplicateSaleNumbers.length} indices for saleNumber.`);
    if (duplicateSaleNumbers.length > 0) {
      console.log('First 5:', duplicateSaleNumbers.slice(0, 5).map(i => i.name));
    }

    // Try to reproduce the error by calling sync({ alter: true }) on a dummy model
    console.log('Testing sync({ alter: true }) on dummy model...');
    const Dummy = sequelize.define('Dummy', {
      name: { type: require('sequelize').DataTypes.STRING, unique: true }
    });
    await Dummy.sync({ alter: true });
    console.log('Dummy sync success.');

  } catch (err) {
    console.error('Debug script failed with error:');
    console.error(err);
    if (err.stack) console.error(err.stack);
  } finally {
    await sequelize.close();
  }
}

debug();
