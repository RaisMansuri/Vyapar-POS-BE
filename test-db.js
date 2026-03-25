require('dotenv').config();
const { sequelize } = require('./src/config/db.config');

async function testConnection() {
  console.log('--- Database Connection Test (PostgreSQL) ---');
  
  if (process.env.POSTGRES_URL) {
    // Hide password for logging
    const maskedUrl = process.env.POSTGRES_URL.replace(/:([^@]+)@/, ':****@');
    console.log('Connecting to:', maskedUrl);
  } else {
    console.error('❌ POSTGRES_URL is not defined in .env');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    console.log('✅ Success! PostgreSQL is connected successfully with Sequelize.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection Failed:');
    console.error(err.name + ': ' + err.message);
    
    if (err.message.includes('ECONNREFUSED')) {
      console.log('\n🔍 Probable cause: Database server is not reachable.');
    }
    
    process.exit(1);
  }
}

testConnection();
