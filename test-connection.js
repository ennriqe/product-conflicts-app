const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Testing database connection...');
console.log('📍 Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
console.log('🌍 NODE_ENV:', process.env.NODE_ENV);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 10000,
});

async function testConnection() {
  try {
    console.log('🔄 Attempting to connect...');
    const client = await pool.connect();
    console.log('✅ Connected successfully!');
    
    const result = await client.query('SELECT current_database(), current_user, version()');
    console.log('📊 Database info:', result.rows[0]);
    
    client.release();
    await pool.end();
    console.log('🎉 Connection test successful!');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('🔍 Full error:', error);
  }
}

testConnection();
