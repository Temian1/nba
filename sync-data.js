// Simple data sync script to populate the database
const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Starting database population...');
console.log('📋 This will sync teams and players from the NBA API');
console.log('⏳ This may take a few minutes due to API rate limits...');

// Create a temporary sync script
const syncScript = `
import { NBAService } from './src/lib/api/nba-service.js';

async function syncData() {
  try {
    const nbaService = NBAService.getInstance();
    
    console.log('📋 Syncing teams...');
    await nbaService.syncTeams();
    
    console.log('👥 Syncing active players...');
    await nbaService.syncActivePlayers();
    
    console.log('✅ Data sync completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

syncData();
`;

const fs = require('fs');
fs.writeFileSync('temp-sync.mjs', syncScript);

// Run the sync
exec('node temp-sync.mjs', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error running sync:', error);
    return;
  }
  
  console.log(stdout);
  if (stderr) console.error(stderr);
  
  // Clean up
  fs.unlinkSync('temp-sync.mjs');
  
  console.log('🎯 Database populated! Restart your dev server.');
});