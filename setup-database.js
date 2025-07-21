const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  user: 'postgres',
  host: 'localhost',
  password: 'password',
  port: 5432,
};

async function setupDatabase() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔄 Setting up NBA Props database...');
    
    // Create database if it doesn't exist
    await pool.query('CREATE DATABASE nba_props');
    console.log('✅ Database "nba_props" created successfully');
    
  } catch (error) {
    if (error.code === '42P04') {
      console.log('ℹ️  Database "nba_props" already exists');
    } else {
      console.error('❌ Error creating database:', error.message);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
  
  // Now connect to the nba_props database
  const nbaPool = new Pool({
    ...dbConfig,
    database: 'nba_props'
  });
  
  try {
    // Test connection
    await nbaPool.query('SELECT NOW()');
    console.log('✅ Connected to nba_props database successfully');
    
    console.log('\n📋 Next steps:');
    console.log('1. Run: npm run db:generate');
    console.log('2. Run: npm run db:migrate');
    console.log('3. Restart the development server: npm run dev');
    console.log('4. Sync NBA data: curl -X POST http://localhost:3000/api/sync -H "Content-Type: application/json" -d \'{"type": "teams"}\' ');
    
  } catch (error) {
    console.error('❌ Error connecting to nba_props database:', error.message);
    console.log('\n🔧 Make sure PostgreSQL is running and the credentials in .env.local are correct');
  } finally {
    await nbaPool.end();
  }
}

setupDatabase();