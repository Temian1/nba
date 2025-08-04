import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Force Node.js to prefer IPv4 for DNS resolution
require('dns').setDefaultResultOrder('ipv4first');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Force IPv4 to resolve DNS issues
  options: '--client_encoding=UTF8',
  connectionTimeoutMillis: 5000,  // Reduced from 10s to 5s
  idleTimeoutMillis: 20000,       // Reduced from 30s to 20s
  query_timeout: 8000,            // Add query timeout
  statement_timeout: 8000,        // Add statement timeout
  max: 10,                        // Reduced pool size
  min: 1,                         // Reduced minimum
  allowExitOnIdle: true,          // Allow pool to close when idle
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit the process, just log the error
});

// Handle pool connection events
pool.on('connect', (client) => {
  console.log('New client connected to database');
});

pool.on('remove', (client) => {
  console.log('Client removed from pool');
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;

// Query timeout wrapper
export const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number = 8000): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
};

// Helper function to close the database connection
export const closeDb = async () => {
  try {
    await pool.end();
    console.log('Database pool closed successfully');
  } catch (error) {
    console.error('Error closing database pool:', error);
  }
};

// Test database connection with retry logic
export const testConnection = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('✅ Database connection successful');
      return true;
    } catch (error) {
      console.error(`❌ Database connection attempt ${i + 1} failed:`, error);
      if (i === retries - 1) {
        return false;
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  return false;
};

// Graceful shutdown handler
export const gracefulShutdown = async () => {
  console.log('Initiating graceful database shutdown...');
  await closeDb();
};

// Handle process termination
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit immediately, let the application handle it
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit immediately, let the application handle it
});