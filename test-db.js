require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  console.log('--- Database Connection Test ---');
  console.log('Connecting to:', process.env.MONGODB_URI.replace(/:([^@]+)@/, ':****@')); // Hide password

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
    });
    console.log('✅ Success! MongoDB is connected.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection Failed:');
    console.error(err.name + ': ' + err.message);
    
    if (err.message.includes('MongooseServerSelectionError') || err.message.includes('Could not connect to any servers')) {
      console.log('\n🔍 Probable cause: Your IP is not whitelisted in MongoDB Atlas.');
      console.log('👉 Solution: Go to MongoDB Atlas > Network Access > Add your current IP.');
    }
    
    process.exit(1);
  }
}

testConnection();
