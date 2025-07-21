import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { players, playerStats, rollingSplits, games, type NewRollingSplit } from '@/lib/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { subDays } from 'date-fns';

// Verify cron secret for security
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn('CRON_SECRET not configured');
    return false;
  }
  
  const authHeader = request.headers.get('authorization');
  const providedSecret = authHeader?.replace('Bearer ', '');
  
  return providedSecret === cronSecret;
}

class RollingSplitsService {
  private parseMinutes(minutesStr?: string): number {
    if (!minutesStr) return 0;
    const parts = minutesStr.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) + (parseInt(parts[1]) / 60);
    }
    return parseFloat(minutesStr) || 0;
  }

  private calculateAverages(stats: any[]) {
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

  async computeRollingSplits(playerId: number, days = [5, 10, 15, 20, 30]) {
    const cutoffDate = subDays(new Date(), Math.max(...days));
    
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

    for (const period of days) {
      const periodStats = recentStats.slice(0, period);
      if (periodStats.length === 0) continue;

      const averages = this.calculateAverages(periodStats);
      
      // Insert rolling splits for each stat type using the existing schema
      const statTypes = [
        { prop: 'pts', value: averages.pts },
        { prop: 'reb', value: averages.reb },
        { prop: 'ast', value: averages.ast },
        { prop: 'stl', value: averages.stl },
        { prop: 'blk', value: averages.blk },
        { prop: 'turnover', value: averages.turnover },
        { prop: 'fgm', value: averages.fgm },
        { prop: 'fga', value: averages.fga },
        { prop: 'fg3m', value: averages.fg3m },
        { prop: 'fg3a', value: averages.fg3a },
        { prop: 'ftm', value: averages.ftm },
        { prop: 'fta', value: averages.fta },
        { prop: 'min', value: averages.min }
      ];

      for (const stat of statTypes) {
        if (stat.value !== undefined && stat.value !== null) {
          const insertData: NewRollingSplit = {
            player_id: playerId,
            prop_type: stat.prop,
            games_count: period,
            average: stat.value.toString()
          };
          
          await db
            .insert(rollingSplits)
            .values(insertData)
            .onConflictDoUpdate({
              target: [rollingSplits.player_id, rollingSplits.prop_type, rollingSplits.games_count],
              set: {
                average: stat.value.toString(),
                last_updated: new Date()
              }
            });
        }
      }
    }
  }

  async processAllPlayers() {
    const cutoffDate = subDays(new Date(), 60);
    
    const activePlayers = await db
      .selectDistinct({ player_id: playerStats.player_id })
      .from(playerStats)
      .innerJoin(games, eq(playerStats.game_id, games.id))
      .where(gte(games.date, cutoffDate));

    let processed = 0;
    let errors = 0;

    for (const { player_id } of activePlayers) {
      try {
        await this.computeRollingSplits(player_id);
        processed++;
      } catch (error) {
        errors++;
        console.error(`Failed to process player ${player_id}:`, error);
      }
    }

    return { processed, errors, total: activePlayers.length };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const startTime = Date.now();
    const service = new RollingSplitsService();
    
    console.log('Starting rolling splits computation...');
    const result = await service.processAllPlayers();
    const duration = Date.now() - startTime;
    
    console.log(`Rolling splits computation completed in ${duration}ms:`, result);
    
    return NextResponse.json({
      success: true,
      message: 'Rolling splits computation completed',
      result,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Rolling splits cron job failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Rolling splits computation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}