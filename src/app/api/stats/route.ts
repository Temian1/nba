import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { playerStats, games, players, teams } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { cacheService, CacheService, CACHE_TTL } from '@/lib/services/cache-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const playerId = searchParams.get('playerId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type') || 'recent'; // 'recent' or 'season'

    if (!playerId) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      );
    }

    const cacheKey = CacheService.generatePlayerStatsKey(parseInt(playerId), { limit, type });

    const result = await cacheService.getOrSet(
      cacheKey,
      async () => {
        if (type === 'season') {
          // Get season averages
          const seasonStats = await db
            .select({
              pts: sql<number>`AVG(${playerStats.pts})`,
              reb: sql<number>`AVG(${playerStats.reb})`,
              ast: sql<number>`AVG(${playerStats.ast})`,
              min: sql<number>`AVG(CAST(SUBSTRING(${playerStats.min}, 1, 2) AS INTEGER))`,
              games: sql<number>`COUNT(*)`,
            })
            .from(playerStats)
            .innerJoin(games, eq(playerStats.game_id, games.id))
            .where(
              and(
                eq(playerStats.player_id, parseInt(playerId)),
                eq(games.season, 2024) // Current season
              )
            );

          return {
            type: 'season',
            playerId: parseInt(playerId),
            averages: seasonStats[0] || {
              pts: 0,
              reb: 0,
              ast: 0,
              min: 0,
              games: 0
            }
          };
        } else {
          // Get recent game stats
          const recentStats = await db
            .select({
              id: playerStats.id,
              pts: playerStats.pts,
              reb: playerStats.reb,
              ast: playerStats.ast,
              min: playerStats.min,
              fgm: playerStats.fgm,
              fga: playerStats.fga,
              fg_pct: playerStats.fg_pct,
              fg3m: playerStats.fg3m,
              fg3a: playerStats.fg3a,
              fg3_pct: playerStats.fg3_pct,
              ftm: playerStats.ftm,
              fta: playerStats.fta,
              ft_pct: playerStats.ft_pct,
              oreb: playerStats.oreb,
              dreb: playerStats.dreb,
              stl: playerStats.stl,
              blk: playerStats.blk,
              turnover: playerStats.turnover,
              pf: playerStats.pf,
              plus_minus: playerStats.plus_minus,
              gameId: games.id,
              gameDate: games.date,
              homeTeamScore: games.home_team_score,
              visitorTeamScore: games.visitor_team_score,
            })
            .from(playerStats)
            .innerJoin(games, eq(playerStats.game_id, games.id))
            .where(eq(playerStats.player_id, parseInt(playerId)))
            .orderBy(desc(games.date))
            .limit(limit);

          return {
            type: 'recent',
            playerId: parseInt(playerId),
            stats: recentStats
          };
        }
      },
      CACHE_TTL.SHORT // Stats cached for short duration
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching player stats:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error while fetching player stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}