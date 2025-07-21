/**
 * Advanced Analytics Service for NBA Props Analysis Platform
 * Provides opponent trends, season comparisons, and advanced metrics
 */

import { db } from '../db';
import { playerStats, games, teams, players } from '../db/schema';
import { eq, and, gte, lte, desc, sql, avg, count, inArray } from 'drizzle-orm';
import { subDays, startOfSeason, endOfSeason, format } from 'date-fns';
import { cacheService, CacheService, CACHE_TTL } from './cache-service';

export interface OpponentTrend {
  opponentId: number;
  opponentName: string;
  opponentAbbreviation: string;
  gamesPlayed: number;
  averageAllowed: number;
  rank: number; // 1 = easiest matchup, 30 = hardest
  lastMeeting?: {
    date: Date;
    playerValue: number;
    result: 'over' | 'under';
  };
}

export interface SeasonComparison {
  currentSeason: {
    average: number;
    games: number;
    trend: 'improving' | 'declining' | 'stable';
  };
  lastSeason?: {
    average: number;
    games: number;
  };
  careerAverage?: {
    average: number;
    seasons: number;
  };
  percentileRank: number; // Player's rank among all players for this stat
}

export interface AdvancedMetrics {
  consistency: {
    standardDeviation: number;
    coefficientOfVariation: number;
    streaks: {
      currentStreak: { type: 'over' | 'under'; count: number };
      longestOverStreak: number;
      longestUnderStreak: number;
    };
  };
  situational: {
    backToBack: { average: number; games: number };
    restDays: {
      noRest: { average: number; games: number };
      oneDay: { average: number; games: number };
      twoPlusDays: { average: number; games: number };
    };
    timeOfSeason: {
      early: { average: number; games: number }; // First 20 games
      mid: { average: number; games: number };   // Games 21-60
      late: { average: number; games: number };  // Last 22 games
    };
  };
  momentum: {
    last5Trend: number; // Slope of last 5 games
    last10Trend: number; // Slope of last 10 games
    hotStreak: boolean; // Above average in 4 of last 5
    coldStreak: boolean; // Below average in 4 of last 5
  };
}

export class AdvancedAnalyticsService {
  private static instance: AdvancedAnalyticsService;

  static getInstance(): AdvancedAnalyticsService {
    if (!AdvancedAnalyticsService.instance) {
      AdvancedAnalyticsService.instance = new AdvancedAnalyticsService();
    }
    return AdvancedAnalyticsService.instance;
  }

  private getStatValue(stat: any, propType: string): number {
    switch (propType) {
      case 'pts': return stat.pts || 0;
      case 'reb': return stat.reb || 0;
      case 'ast': return stat.ast || 0;
      case 'stl': return stat.stl || 0;
      case 'blk': return stat.blk || 0;
      case 'turnover': return stat.turnover || 0;
      case 'pra': return (stat.pts || 0) + (stat.reb || 0) + (stat.ast || 0);
      case 'pr': return (stat.pts || 0) + (stat.reb || 0);
      case 'pa': return (stat.pts || 0) + (stat.ast || 0);
      case 'ra': return (stat.reb || 0) + (stat.ast || 0);
      case 'fg3m': return stat.fg3m || 0;
      case 'fgm': return stat.fgm || 0;
      case 'ftm': return stat.ftm || 0;
      default: return 0;
    }
  }

  /**
   * Get opponent trends for a specific stat type
   */
  async getOpponentTrends(
    propType: string,
    season: string = '2023-24'
  ): Promise<OpponentTrend[]> {
    const cacheKey = `opponent-trends:${propType}:${season}`;
    
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        // Get all teams and their defensive stats for the prop type
        const opponentStats = await db
          .select({
            teamId: teams.id,
            teamName: teams.full_name,
            teamAbbreviation: teams.abbreviation,
            avgAllowed: sql<number>`AVG(CASE 
              WHEN ${propType} = 'pts' THEN ${playerStats.pts}
              WHEN ${propType} = 'reb' THEN ${playerStats.reb}
              WHEN ${propType} = 'ast' THEN ${playerStats.ast}
              WHEN ${propType} = 'stl' THEN ${playerStats.stl}
              WHEN ${propType} = 'blk' THEN ${playerStats.blk}
              WHEN ${propType} = 'turnover' THEN ${playerStats.turnover}
              WHEN ${propType} = 'pra' THEN ${playerStats.pts} + ${playerStats.reb} + ${playerStats.ast}
              WHEN ${propType} = 'pr' THEN ${playerStats.pts} + ${playerStats.reb}
              WHEN ${propType} = 'pa' THEN ${playerStats.pts} + ${playerStats.ast}
              WHEN ${propType} = 'ra' THEN ${playerStats.reb} + ${playerStats.ast}
              WHEN ${propType} = 'fg3m' THEN ${playerStats.fg3m}
              WHEN ${propType} = 'fgm' THEN ${playerStats.fgm}
              WHEN ${propType} = 'ftm' THEN ${playerStats.ftm}
              ELSE 0
            END)`,
            gamesPlayed: count(playerStats.id)
          })
          .from(playerStats)
          .innerJoin(games, eq(playerStats.game_id, games.id))
          .innerJoin(teams, sql`
            CASE 
              WHEN ${games.home_team_id} = ${playerStats.team_id} 
              THEN ${teams.id} = ${games.visitor_team_id}
              ELSE ${teams.id} = ${games.home_team_id}
            END
          `)
          .where(
            and(
              gte(games.date, new Date(`${season.split('-')[0]}-10-01`)),
              lte(games.date, new Date(`${season.split('-')[1]}-06-30`))
            )
          )
          .groupBy(teams.id, teams.full_name, teams.abbreviation)
          .having(sql`COUNT(${playerStats.id}) >= 10`) // Minimum 10 games
          .orderBy(sql`AVG(CASE 
            WHEN ${propType} = 'pts' THEN ${playerStats.pts}
            WHEN ${propType} = 'reb' THEN ${playerStats.reb}
            WHEN ${propType} = 'ast' THEN ${playerStats.ast}
            WHEN ${propType} = 'stl' THEN ${playerStats.stl}
            WHEN ${propType} = 'blk' THEN ${playerStats.blk}
            WHEN ${propType} = 'turnover' THEN ${playerStats.turnover}
            WHEN ${propType} = 'pra' THEN ${playerStats.pts} + ${playerStats.reb} + ${playerStats.ast}
            WHEN ${propType} = 'pr' THEN ${playerStats.pts} + ${playerStats.reb}
            WHEN ${propType} = 'pa' THEN ${playerStats.pts} + ${playerStats.ast}
            WHEN ${propType} = 'ra' THEN ${playerStats.reb} + ${playerStats.ast}
            WHEN ${propType} = 'fg3m' THEN ${playerStats.fg3m}
            WHEN ${propType} = 'fgm' THEN ${playerStats.fgm}
            WHEN ${propType} = 'ftm' THEN ${playerStats.ftm}
            ELSE 0
          END) DESC`);

        return opponentStats.map((stat, index) => ({
          opponentId: stat.teamId,
          opponentName: stat.teamName,
          opponentAbbreviation: stat.teamAbbreviation,
          gamesPlayed: stat.gamesPlayed,
          averageAllowed: Math.round(stat.avgAllowed * 10) / 10,
          rank: index + 1
        }));
      },
      CACHE_TTL.LONG // Opponent trends cached for 1 hour
    );
  }

  /**
   * Get season comparison for a player
   */
  async getSeasonComparison(
    playerId: number,
    propType: string,
    currentSeason: string = '2023-24'
  ): Promise<SeasonComparison> {
    const cacheKey = `season-comparison:${playerId}:${propType}:${currentSeason}`;
    
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        // Current season stats
        const currentSeasonStats = await db
          .select({
            value: sql<number>`CASE 
              WHEN ${propType} = 'pts' THEN ${playerStats.pts}
              WHEN ${propType} = 'reb' THEN ${playerStats.reb}
              WHEN ${propType} = 'ast' THEN ${playerStats.ast}
              WHEN ${propType} = 'stl' THEN ${playerStats.stl}
              WHEN ${propType} = 'blk' THEN ${playerStats.blk}
              WHEN ${propType} = 'turnover' THEN ${playerStats.turnover}
              WHEN ${propType} = 'pra' THEN ${playerStats.pts} + ${playerStats.reb} + ${playerStats.ast}
              WHEN ${propType} = 'pr' THEN ${playerStats.pts} + ${playerStats.reb}
              WHEN ${propType} = 'pa' THEN ${playerStats.pts} + ${playerStats.ast}
              WHEN ${propType} = 'ra' THEN ${playerStats.reb} + ${playerStats.ast}
              WHEN ${propType} = 'fg3m' THEN ${playerStats.fg3m}
              WHEN ${propType} = 'fgm' THEN ${playerStats.fgm}
              WHEN ${propType} = 'ftm' THEN ${playerStats.ftm}
              ELSE 0
            END`,
            gameDate: games.date
          })
          .from(playerStats)
          .innerJoin(games, eq(playerStats.game_id, games.id))
          .where(
            and(
              eq(playerStats.player_id, playerId),
              gte(games.date, new Date(`${currentSeason.split('-')[0]}-10-01`)),
              lte(games.date, new Date(`${currentSeason.split('-')[1]}-06-30`))
            )
          )
          .orderBy(desc(games.date));

        const currentAverage = currentSeasonStats.length > 0 
          ? currentSeasonStats.reduce((sum, stat) => sum + stat.value, 0) / currentSeasonStats.length
          : 0;

        // Calculate trend (last 10 vs first 10 games)
        const recent10 = currentSeasonStats.slice(0, 10);
        const early10 = currentSeasonStats.slice(-10);
        
        const recentAvg = recent10.length > 0 
          ? recent10.reduce((sum, stat) => sum + stat.value, 0) / recent10.length 
          : 0;
        const earlyAvg = early10.length > 0 
          ? early10.reduce((sum, stat) => sum + stat.value, 0) / early10.length 
          : 0;
        
        let trend: 'improving' | 'declining' | 'stable' = 'stable';
        if (recentAvg > earlyAvg * 1.1) trend = 'improving';
        else if (recentAvg < earlyAvg * 0.9) trend = 'declining';

        // Get percentile rank among all players
        const allPlayersAvg = await db
          .select({
            playerId: playerStats.player_id,
            average: sql<number>`AVG(CASE 
              WHEN ${propType} = 'pts' THEN ${playerStats.pts}
              WHEN ${propType} = 'reb' THEN ${playerStats.reb}
              WHEN ${propType} = 'ast' THEN ${playerStats.ast}
              WHEN ${propType} = 'stl' THEN ${playerStats.stl}
              WHEN ${propType} = 'blk' THEN ${playerStats.blk}
              WHEN ${propType} = 'turnover' THEN ${playerStats.turnover}
              WHEN ${propType} = 'pra' THEN ${playerStats.pts} + ${playerStats.reb} + ${playerStats.ast}
              WHEN ${propType} = 'pr' THEN ${playerStats.pts} + ${playerStats.reb}
              WHEN ${propType} = 'pa' THEN ${playerStats.pts} + ${playerStats.ast}
              WHEN ${propType} = 'ra' THEN ${playerStats.reb} + ${playerStats.ast}
              WHEN ${propType} = 'fg3m' THEN ${playerStats.fg3m}
              WHEN ${propType} = 'fgm' THEN ${playerStats.fgm}
              WHEN ${propType} = 'ftm' THEN ${playerStats.ftm}
              ELSE 0
            END)`
          })
          .from(playerStats)
          .innerJoin(games, eq(playerStats.game_id, games.id))
          .where(
            and(
              gte(games.date, new Date(`${currentSeason.split('-')[0]}-10-01`)),
              lte(games.date, new Date(`${currentSeason.split('-')[1]}-06-30`))
            )
          )
          .groupBy(playerStats.player_id)
          .having(sql`COUNT(${playerStats.id}) >= 10`)
          .orderBy(sql`AVG(CASE 
            WHEN ${propType} = 'pts' THEN ${playerStats.pts}
            WHEN ${propType} = 'reb' THEN ${playerStats.reb}
            WHEN ${propType} = 'ast' THEN ${playerStats.ast}
            WHEN ${propType} = 'stl' THEN ${playerStats.stl}
            WHEN ${propType} = 'blk' THEN ${playerStats.blk}
            WHEN ${propType} = 'turnover' THEN ${playerStats.turnover}
            WHEN ${propType} = 'pra' THEN ${playerStats.pts} + ${playerStats.reb} + ${playerStats.ast}
            WHEN ${propType} = 'pr' THEN ${playerStats.pts} + ${playerStats.reb}
            WHEN ${propType} = 'pa' THEN ${playerStats.pts} + ${playerStats.ast}
            WHEN ${propType} = 'ra' THEN ${playerStats.reb} + ${playerStats.ast}
            WHEN ${propType} = 'fg3m' THEN ${playerStats.fg3m}
            WHEN ${propType} = 'fgm' THEN ${playerStats.fgm}
            WHEN ${propType} = 'ftm' THEN ${playerStats.ftm}
            ELSE 0
          END) DESC`);

        const playerRank = allPlayersAvg.findIndex(p => p.playerId === playerId) + 1;
        const percentileRank = playerRank > 0 
          ? Math.round((1 - (playerRank - 1) / allPlayersAvg.length) * 100)
          : 0;

        return {
          currentSeason: {
            average: Math.round(currentAverage * 10) / 10,
            games: currentSeasonStats.length,
            trend
          },
          percentileRank
        };
      },
      CACHE_TTL.MEDIUM // Season comparison cached for 15 minutes
    );
  }

  /**
   * Get advanced metrics for a player
   */
  async getAdvancedMetrics(
    playerId: number,
    propType: string,
    season: string = '2023-24'
  ): Promise<AdvancedMetrics> {
    const cacheKey = `advanced-metrics:${playerId}:${propType}:${season}`;
    
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        // Get all player stats for the season
        const seasonStats = await db
          .select({
            value: sql<number>`CASE 
              WHEN ${propType} = 'pts' THEN ${playerStats.pts}
              WHEN ${propType} = 'reb' THEN ${playerStats.reb}
              WHEN ${propType} = 'ast' THEN ${playerStats.ast}
              WHEN ${propType} = 'stl' THEN ${playerStats.stl}
              WHEN ${propType} = 'blk' THEN ${playerStats.blk}
              WHEN ${propType} = 'turnover' THEN ${playerStats.turnover}
              WHEN ${propType} = 'pra' THEN ${playerStats.pts} + ${playerStats.reb} + ${playerStats.ast}
              WHEN ${propType} = 'pr' THEN ${playerStats.pts} + ${playerStats.reb}
              WHEN ${propType} = 'pa' THEN ${playerStats.pts} + ${playerStats.ast}
              WHEN ${propType} = 'ra' THEN ${playerStats.reb} + ${playerStats.ast}
              WHEN ${propType} = 'fg3m' THEN ${playerStats.fg3m}
              WHEN ${propType} = 'fgm' THEN ${playerStats.fgm}
              WHEN ${propType} = 'ftm' THEN ${playerStats.ftm}
              ELSE 0
            END`,
            gameDate: games.date,
            gameId: games.id
          })
          .from(playerStats)
          .innerJoin(games, eq(playerStats.game_id, games.id))
          .where(
            and(
              eq(playerStats.player_id, playerId),
              gte(games.date, new Date(`${season.split('-')[0]}-10-01`)),
              lte(games.date, new Date(`${season.split('-')[1]}-06-30`))
            )
          )
          .orderBy(desc(games.date));

        if (seasonStats.length === 0) {
          throw new Error('No stats available for advanced metrics calculation');
        }

        // Calculate consistency metrics
        const values = seasonStats.map(s => s.value);
        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
        const standardDeviation = Math.sqrt(variance);
        const coefficientOfVariation = average > 0 ? (standardDeviation / average) * 100 : 0;

        // Calculate streaks
        const streaks = this.calculateStreaks(values, average);

        // Calculate momentum trends
        const last5 = values.slice(0, 5);
        const last10 = values.slice(0, 10);
        
        const last5Trend = this.calculateTrend(last5);
        const last10Trend = this.calculateTrend(last10);
        
        const hotStreak = last5.filter(val => val > average).length >= 4;
        const coldStreak = last5.filter(val => val < average).length >= 4;

        return {
          consistency: {
            standardDeviation: Math.round(standardDeviation * 100) / 100,
            coefficientOfVariation: Math.round(coefficientOfVariation * 100) / 100,
            streaks
          },
          situational: {
            backToBack: { average: 0, games: 0 }, // Would need game schedule data
            restDays: {
              noRest: { average: 0, games: 0 },
              oneDay: { average: 0, games: 0 },
              twoPlusDays: { average: 0, games: 0 }
            },
            timeOfSeason: {
              early: this.calculatePeriodStats(values.slice(-20)), // First 20 games
              mid: this.calculatePeriodStats(values.slice(22, -20)), // Middle games
              late: this.calculatePeriodStats(values.slice(0, 22)) // Last 22 games
            }
          },
          momentum: {
            last5Trend,
            last10Trend,
            hotStreak,
            coldStreak
          }
        };
      },
      CACHE_TTL.MEDIUM // Advanced metrics cached for 15 minutes
    );
  }

  private calculateStreaks(values: number[], average: number) {
    let currentStreak = { type: 'over' as 'over' | 'under', count: 0 };
    let longestOverStreak = 0;
    let longestUnderStreak = 0;
    let currentOverStreak = 0;
    let currentUnderStreak = 0;

    for (let i = 0; i < values.length; i++) {
      const isOver = values[i] > average;
      
      if (isOver) {
        currentOverStreak++;
        currentUnderStreak = 0;
        longestOverStreak = Math.max(longestOverStreak, currentOverStreak);
        
        if (i === 0) {
          currentStreak = { type: 'over', count: currentOverStreak };
        } else if (currentStreak.type === 'over') {
          currentStreak.count = currentOverStreak;
        }
      } else {
        currentUnderStreak++;
        currentOverStreak = 0;
        longestUnderStreak = Math.max(longestUnderStreak, currentUnderStreak);
        
        if (i === 0) {
          currentStreak = { type: 'under', count: currentUnderStreak };
        } else if (currentStreak.type === 'under') {
          currentStreak.count = currentUnderStreak;
        }
      }
    }

    return {
      currentStreak,
      longestOverStreak,
      longestUnderStreak
    };
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + val * (index + 1), 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return Math.round(slope * 100) / 100;
  }

  private calculatePeriodStats(values: number[]) {
    if (values.length === 0) {
      return { average: 0, games: 0 };
    }
    
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    return {
      average: Math.round(average * 10) / 10,
      games: values.length
    };
  }
}

// Export singleton instance
export const advancedAnalyticsService = AdvancedAnalyticsService.getInstance();