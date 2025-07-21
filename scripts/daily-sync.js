#!/usr/bin/env node

/**
 * Daily NBA Data Synchronization Script
 * 
 * This script performs automated daily synchronization of NBA data.
 * It can be run manually or scheduled as a cron job.
 * 
 * Usage:
 *   node scripts/daily-sync.js [date]
 * 
 * Examples:
 *   node scripts/daily-sync.js                    # Sync yesterday's data
 *   node scripts/daily-sync.js 2024-01-15        # Sync specific date
 */

const { NBAService } = require('../src/lib/api/nba-service');
const { testConnection } = require('../src/lib/db');

// Configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

/**
 * Sleep function for delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Log with timestamp
 */
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

/**
 * Retry function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
      log(`Attempt ${attempt} failed: ${error.message}. Retrying in ${delay}ms...`, 'WARN');
      await sleep(delay);
    }
  }
}

/**
 * Main synchronization function
 */
async function performDailySync(targetDate) {
  const startTime = Date.now();
  log('='.repeat(60));
  log('Starting NBA Daily Data Synchronization');
  log('='.repeat(60));

  try {
    // Test database connection
    log('Testing database connection...');
    await retryWithBackoff(async () => {
      await testConnection();
      log('Database connection successful');
    });

    // Initialize NBA service
    log('Initializing NBA service...');
    const nbaService = new NBAService();

    // Determine sync date
    const syncDate = targetDate ? new Date(targetDate) : (() => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday;
    })();

    if (isNaN(syncDate.getTime())) {
      throw new Error(`Invalid date format: ${targetDate}`);
    }

    log(`Synchronizing data for: ${syncDate.toDateString()}`);

    // Perform synchronization with retries
    const result = await retryWithBackoff(async () => {
      return await nbaService.performDailySync(syncDate);
    });

    // Log results
    log('Synchronization completed successfully!');
    log(`Teams synced: ${result.teamsCount || 'N/A'}`);
    log(`Players synced: ${result.playersCount || 'N/A'}`);
    log(`Games synced: ${result.gamesCount || 0}`);
    log(`Stats synced: ${result.statsCount || 0}`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`Total execution time: ${duration} seconds`);

    return {
      success: true,
      date: syncDate.toDateString(),
      duration: `${duration}s`,
      ...result
    };

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`Synchronization failed after ${duration} seconds`, 'ERROR');
    log(`Error: ${error.message}`, 'ERROR');
    
    if (error.stack) {
      log(`Stack trace: ${error.stack}`, 'ERROR');
    }

    return {
      success: false,
      error: error.message,
      duration: `${duration}s`
    };
  } finally {
    log('='.repeat(60));
  }
}

/**
 * Setup cron job (if running as a service)
 */
function setupCronJob() {
  const cron = require('node-cron');
  
  // Run every day at 6:00 AM
  cron.schedule('0 6 * * *', async () => {
    log('Cron job triggered - starting daily sync');
    await performDailySync();
  }, {
    scheduled: true,
    timezone: "America/New_York" // NBA timezone
  });

  log('Cron job scheduled: Daily sync at 6:00 AM EST');
  log('Press Ctrl+C to stop the service');

  // Keep the process alive
  process.on('SIGINT', () => {
    log('Received SIGINT, shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    log('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
  });
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'cron':
    case 'service':
      // Run as a service with cron scheduling
      setupCronJob();
      break;
      
    case 'help':
    case '--help':
    case '-h':
      console.log(`
NBA Daily Sync Script

Usage:
  node scripts/daily-sync.js [command|date]

Commands:
  cron, service    Run as a background service with cron scheduling
  help             Show this help message

Examples:
  node scripts/daily-sync.js                    # Sync yesterday's data
  node scripts/daily-sync.js 2024-01-15        # Sync specific date
  node scripts/daily-sync.js cron               # Run as cron service
`);
      break;
      
    default:
      // Run once with optional date parameter
      const result = await performDailySync(command);
      process.exit(result.success ? 0 : 1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'ERROR');
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.message}`, 'ERROR');
  log(`Stack: ${error.stack}`, 'ERROR');
  process.exit(1);
});

// Run main function
if (require.main === module) {
  main().catch(error => {
    log(`Fatal error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}

module.exports = {
  performDailySync,
  setupCronJob
};