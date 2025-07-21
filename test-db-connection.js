const { Pool } = require('pg');
const dns = require('dns');
require('dotenv').config({ path: '.env.local' });

// Force Node.js to prefer IPv4
dns.setDefaultResultOrder('ipv4first');

// Custom DNS resolver to force IPv4
const originalLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};
  options.family = 4; // Force IPv4
  return originalLookup(hostname, options, callback);
};

async function testConnection() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    // Force IPv4 to resolve DNS issues
    options: '--client_encoding=UTF8',
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  });

  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Found' : 'Not found');
    
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connection successful!');
    console.log('Current time from database:', result.rows[0].now);
    client.release();
    
    // Test if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log('\n📊 Existing tables:');
      tablesResult.rows.forEach(row => {
        console.log('  -', row.table_name);
      });
    } else {
      console.log('\n⚠️  No tables found. You need to run database migrations.');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.error('\n🔍 DNS Resolution Issue:');
      console.error('- Check your internet connection');
      console.error('- Verify the Supabase URL is correct');
      console.error('- Try accessing the Supabase dashboard to confirm the project is active');
      console.error('- This might be an IPv6 connectivity issue');
    }
  } finally {
    await pool.end();
  }
}

testConnection();