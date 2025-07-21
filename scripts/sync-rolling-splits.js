#!/usr/bin/env node

/**
 * Automated Rolling Splits Computation Script
 * This script computes and updates rolling splits for all players
 * Run this script daily via cron job
 */

const { db } = require('../src/lib/db');
const { players, playerStats, rollingSplits, games } = require('../src/lib/db/schema');
const { eq, and, gte, lte, desc, sql } = require('drizzle-orm');
const { subDays, format } = require('date-fns');

class RollingSplitsService {
  constructor() {
    this.logPrefix = '[ROLLING-SPLITS]';
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${this.logPrefix} [${level.toUpperCase()}] ${message}`);
  }

  async computeRollingSplits(playerId, days = [5, 10, 15, 20, 30]) {
    try {
      const cutoffDate = subDays(new Date(), Math.max(...days));
      
      // Get recent player stats
      const recentStats = await db
        .select({
          game_date: games.date,
          pts: playerStats.pts,
          reb: playerStats.reb,
          ast: playerStats.ast,
          stl: playerStats.stl,
          blk: playerStats.blk,
          turnover: playerStats.turnover,
          fgm: playerStats.fgm,
          fga: playerStats.fga,
          fg3m: playerStats.fg3m,
          fg3a: playerStats.fg3a,
          ftm: playerStats.ftm,
          fta: playerStats.fta,
          min: playerStats.min
        })
        .from(playerStats)
        .innerJoin(games, eq(playerStats.game_id, games.id))
        .where(
          and(
            eq(playerStats.player_id, playerId),
            gte(games.date, cutoffDate)
          )
        )
        .orderBy(desc(games.date));

      if (recentStats.length === 0) {
        return;
      }

      // Compute rolling averages for each period
      for (const period of days) {
        const periodStats = recentStats.slice(0, period);
        if (periodStats.length === 0) continue;

        const averages = this.calculateAverages(periodStats);
        
        // Insert or update rolling splits
        await db
          .insert(rollingSplits)
          .values({
            player_id: playerId,
            period_days: period,
            games_played: periodStats.length,
            avg_pts: averages.pts,
            avg_reb: averages.reb,
            avg_ast: averages.ast,
            avg_stl: averages.stl,
            avg_blk: averages.blk,
            avg_turnover: averages.turnover,
            avg_fgm: averages.fgm,
            avg_fga: averages.fga,
            avg_fg_pct: averages.fg_pct,
            avg_fg3m: averages.fg3m,
            avg_fg3a: averages.fg3a,
            avg_fg3_pct: averages.fg3_pct,
            avg_ftm: averages.ftm,
            avg_fta: averages.fta,
            avg_ft_pct: averages.ft_pct,
            avg_min: averages.min,
            last_updated: new Date()
          })
          .onConflictDoUpdate({
            target: [rollingSplits.player_id, rollingSplits.period_days],
            set: {
              games_played: periodStats.length,
              avg_pts: averages.pts,
              avg_reb: averages.reb,
              avg_ast: averages.ast,
              avg_stl: averages.stl,
              avg_blk: averages.blk,
              avg_turnover: averages.turnover,
              avg_fgm: averages.fgm,
              avg_fga: averages.fga,
              avg_fg_pct: averages.fg_pct,
              avg_fg3m: averages.fg3m,
              avg_fg3a: averages.fg3a,
              avg_fg3_pct: averages.fg3_pct,
              avg_ftm: averages.ftm,
              avg_fta: averages.fta,
              avg_ft_pct: averages.ft_pct,
              avg_min: averages.min,
              last_updated: new Date()
            }
          });
      }
    } catch (error) {
      this.log(`Error computing rolling splits for player ${playerId}: ${error.message}`, 'error');
      throw error;
    }
  }

  calculateAverages(stats) {
    const count = stats.length;
    if (count === 0) return {};

    const totals = stats.reduce((acc, stat) => {
      acc.pts += stat.pts || 0;
      acc.reb += stat.reb || 0;
      acc.ast += stat.ast || 0;
      acc.stl += stat.stl || 0;
      acc.blk += stat.blk || 0;
      acc.turnover += stat.turnover || 0;
      acc.fgm += stat.fgm || 0;
      acc.fga += stat.fga || 0;
      acc.fg3m += stat.fg3m || 0;
      acc.fg3a += stat.fg3a || 0;
      acc.ftm += stat.ftm || 0;
      acc.fta += stat.fta || 0;
      
      // Parse minutes
      const minutes = this.parseMinutes(stat.min);
      acc.min += minutes;
      
      return acc;
    }, {
      pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, turnover: 0,
      fgm: 0, fga: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0, min: 0
    });

    return {
      pts: Math.round((totals.pts / count) * 10) / 10,
      reb: Math.round((totals.reb / count) * 10) / 10,
      ast: Math.round((totals.ast / count) * 10) / 10,
      stl: Math.round((totals.stl / count) * 10) / 10,
      blk: Math.round((totals.blk / count) * 10) / 10,
      turnover: Math.round((totals.turnover / count) * 10) / 10,
      fgm: Math.round((totals.fgm / count) * 10) / 10,
      fga: Math.round((totals.fga / count) * 10) / 10,
      fg_pct: totals.fga > 0 ? Math.round((totals.fgm / totals.fga) * 1000) / 10 : 0,
      fg3m: Math.round((totals.fg3m / count) * 10) / 10,
      fg3a: Math.round((totals.fg3a / count) * 10) / 10,
      fg3_pct: totals.fg3a > 0 ? Math.round((totals.fg3m / totals.fg3a) * 1000) / 10 : 0,
      ftm: Math.round((totals.ftm / count) * 10) / 10,
      fta: Math.round((totals.fta / count) * 10) / 10,
      ft_pct: totals.fta > 0 ? Math.round((totals.ftm / totals.fta) * 1000) / 10 : 0,
      min: Math.round((totals.min / count) * 10) / 10
    };
  }

  parseMinutes(minutesStr) {
    if (!minutesStr) return 0;
    const parts = minutesStr.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) + (parseInt(parts[1]) / 60);
    }
    return parseFloat(minutesStr) || 0;
  }

  async processAllPlayers() {
    try {
      this.log('Starting rolling splits computation for all players');
      
      // Get all active players (those with recent stats)
      const cutoffDate = subDays(new Date(), 60); // Players with stats in last 60 days
      
      const activePlayers = await db
        .selectDistinct({ player_id: playerStats.player_id })
        .from(playerStats)
        .innerJoin(games, eq(playerStats.game_id, games.id))
        .where(gte(games.date, cutoffDate));

      this.log(`Found ${activePlayers.length} active players to process`);

      let processed = 0;
      let errors = 0;

      for (const { player_id } of activePlayers) {
        try {
          await this.computeRollingSplits(player_id);
          processed++;
          
          if (processed % 50 === 0) {
            this.log(`Processed ${processed}/${activePlayers.length} players`);
          }
        } catch (error) {
          errors++;
          this.log(`Failed to process player ${player_id}: ${error.message}`, 'error');
        }
      }

      this.log(`Rolling splits computation completed. Processed: ${processed}, Errors: ${errors}`);
      return { processed, errors, total: activePlayers.length };
    } catch (error) {
      this.log(`Fatal error in processAllPlayers: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Main execution
async function main() {
  const service = new RollingSplitsService();
  
  try {
    const startTime = Date.now();
    const result = await service.processAllPlayers();
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    service.log(`Rolling splits sync completed in ${duration}s. Result: ${JSON.stringify(result)}`);
    process.exit(0);
  } catch (error) {
    service.log(`Rolling splits sync failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { RollingSplitsService };