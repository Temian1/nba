import { db } from '../db';
import { playerStats, propOutcomes, rollingSplits, games, players, teams } from '../db/schema';
import { eq, and, gte, lte, desc, sql, avg, count } from 'drizzle-orm';
import { subDays } from 'date-fns';
import { cacheService, CacheService, CACHE_TTL } from './cache-service';
import { withDbFallback } from '../db/fallback-service';
import { CACHE_KEYS } from '../storage';

export interface PropFilter {
  homeAway?: 'home' | 'away';
  minMinutes?: number;
  lastNGames?: number;
  opponentTeamId?: number;
  startDate?: Date;
  endDate?: Date;
  excludeTeammates?: number[]; // player IDs to exclude from lineup
}

export interface PropAnalysis {
  propType: string;
  propLine: number;
  hitRate: number;
  average: number;
  overCount: number;
  underCount: number;
  totalGames: number;
  recentForm: {
    last5: { hitRate: number; average: number };
    last10: { hitRate: number; average: number };
    last20: { hitRate: number; average: number };
  };
  homeAwayStats: {
    home: { hitRate: number; average: number; games: number };
    away: { hitRate: number; average: number; games: number };
  };
  noDataAvailable?: boolean;
}

export interface GameOutcome {
  gameId: number;
  date: Date;
  opponent: string;
  isHome: boolean;
  actualValue: number;
  result: 'over' | 'under';
  minutes?: string;
}

export class PropAnalyticsService {
  private static instance: PropAnalyticsService;

  static getInstance(): PropAnalyticsService {
    if (!PropAnalyticsService.instance) {
      PropAnalyticsService.instance = new PropAnalyticsService();
    }
    return PropAnalyticsService.instance;
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

  private parseMinutes(minutesStr?: string): number {
    if (!minutesStr) return 0;
    const parts = minutesStr.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) + (parseInt(parts[1]) / 60);
    }
    return parseFloat(minutesStr) || 0;
  }

  private async getGamesWithTeammates(playerId: number, excludeTeammateIds: number[]): Promise<number[]> {
    return await withDbFallback(
      async () => {
        // Get all games where the target player played
        const playerGames = await db
          .select({ game_id: playerStats.game_id, team_id: playerStats.team_id })
          .from(playerStats)
          .where(eq(playerStats.player_id, playerId));

        const gameIdsWithExcludedTeammates: number[] = [];

        // For each game, check if any excluded teammates also played
        for (const game of playerGames) {
          const teammatesInGame = await db
            .select({ player_id: playerStats.player_id })
            .from(playerStats)
            .where(
              and(
                eq(playerStats.game_id, game.game_id),
                eq(playerStats.team_id, game.team_id), // Same team
                sql`${playerStats.player_id} IN (${excludeTeammateIds.join(',')})`
              )
            );

          if (teammatesInGame.length > 0) {
            gameIdsWithExcludedTeammates.push(game.game_id);
          }
        }

        return gameIdsWithExcludedTeammates;
      },
      `${CACHE_KEYS.PROP_ANALYSIS}_teammates_${playerId}_${excludeTeammateIds.join(',')}`,
      []
    );
  }

  async getPlayerStatsWithFilters(playerId: number, filters?: PropFilter): Promise<any[]> {
    return await withDbFallback(
      async () => {
        // Check cache first
        const cacheKey = CacheService.generatePlayerStatsKey(playerId, filters);
        const cached = cacheService.get<any[]>(cacheKey);
        if (cached) {
          return cached;
        }

      let whereConditions = [eq(playerStats.player_id, playerId)];

      // Date filters
      if (filters?.startDate) {
        whereConditions.push(gte(games.date, filters.startDate));
      }
      if (filters?.endDate) {
        whereConditions.push(lte(games.date, filters.endDate));
      }

      let query = db
        .select({
          id: playerStats.id,
          game_id: playerStats.game_id,
          game_date: games.date,
          home_team_id: games.home_team_id,
          visitor_team_id: games.visitor_team_id,
          player_team_id: playerStats.team_id,
          opponent_name: teams.name,
          opponent_abbreviation: teams.abbreviation,
          min: playerStats.min,
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
          fta: playerStats.fta
        })
        .from(playerStats)
        .innerJoin(games, eq(playerStats.game_id, games.id))
        .leftJoin(teams, sql`
          CASE 
            WHEN ${games.home_team_id} = ${playerStats.team_id} 
            THEN ${teams.id} = ${games.visitor_team_id}
            ELSE ${teams.id} = ${games.home_team_id}
          END
        `)
        .where(and(...whereConditions))
        .orderBy(desc(games.date));

      if (filters?.lastNGames) {
        query = (query as any).limit(filters.lastNGames);
      }

      let results = await query;

      // Apply additional filters
      if (filters?.homeAway) {
        results = results.filter(stat => {
          const isHome = stat.home_team_id === stat.player_team_id;
          return filters.homeAway === 'home' ? isHome : !isHome;
        });
      }

      if (filters?.minMinutes) {
        results = results.filter(stat => {
          const minutes = this.parseMinutes(stat.min || undefined);
          return minutes >= (filters.minMinutes || 0);
        });
      }

      if (filters?.opponentTeamId) {
        results = results.filter(stat => {
          const opponentId = stat.home_team_id === stat.player_team_id 
            ? stat.visitor_team_id 
            : stat.home_team_id;
          return opponentId === filters.opponentTeamId;
        });
      }

      // Apply excludeTeammates filter
      if (filters?.excludeTeammates && filters.excludeTeammates.length > 0) {
        const gameIdsToExclude = await this.getGamesWithTeammates(playerId, filters.excludeTeammates);
        results = results.filter(stat => !gameIdsToExclude.includes(stat.game_id));
      }

        // Cache the results
        cacheService.set(cacheKey, results, CACHE_TTL.MEDIUM);
        return results;
      },
      `${CACHE_KEYS.PLAYER_STATS}_${playerId}_${JSON.stringify(filters)}`,
      []
    );
  }

  async analyzeProp(
    playerId: number, 
    propType: string, 
    propLine: number, 
    filters?: PropFilter
  ): Promise<PropAnalysis> {
    try {
      // Check cache first
      const cacheKey = CacheService.generatePropAnalysisKey(playerId, propType, propLine, filters);
      const cached = cacheService.get<PropAnalysis>(cacheKey);
      if (cached) {
        return cached;
      }

      const stats = await this.getPlayerStatsWithFilters(playerId, filters);
      
      if (stats.length === 0) {
        // Return a default analysis structure when no data is available
        const defaultAnalysis = {
          propType,
          propLine,
          hitRate: 0,
          average: 0,
          overCount: 0,
          underCount: 0,
          totalGames: 0,
          recentForm: {
            last5: { hitRate: 0, average: 0 },
            last10: { hitRate: 0, average: 0 },
            last20: { hitRate: 0, average: 0 }
          },
          homeAwayStats: {
            home: { hitRate: 0, average: 0, games: 0 },
            away: { hitRate: 0, average: 0, games: 0 }
          },
          noDataAvailable: true
        };
        
        // Cache the default analysis
        cacheService.set(cacheKey, defaultAnalysis, CACHE_TTL.SHORT);
        return defaultAnalysis;
      }

      // Calculate basic metrics
      const outcomes = stats.map(stat => {
        const actualValue = this.getStatValue(stat, propType);
        return {
          ...stat,
          actualValue,
          result: actualValue > propLine ? 'over' : 'under'
        };
      });

      const overCount = outcomes.filter(o => o.result === 'over').length;
      const underCount = outcomes.filter(o => o.result === 'under').length;
      const totalGames = outcomes.length;
      const hitRate = (overCount / totalGames) * 100;
      const average = outcomes.reduce((sum, o) => sum + o.actualValue, 0) / totalGames;

      // Calculate recent form
      const last5 = outcomes.slice(0, 5);
      const last10 = outcomes.slice(0, 10);
      const last20 = outcomes.slice(0, 20);

      const recentForm = {
        last5: {
          hitRate: last5.length > 0 ? (last5.filter(o => o.result === 'over').length / last5.length) * 100 : 0,
          average: last5.length > 0 ? last5.reduce((sum, o) => sum + o.actualValue, 0) / last5.length : 0
        },
        last10: {
          hitRate: last10.length > 0 ? (last10.filter(o => o.result === 'over').length / last10.length) * 100 : 0,
          average: last10.length > 0 ? last10.reduce((sum, o) => sum + o.actualValue, 0) / last10.length : 0
        },
        last20: {
          hitRate: last20.length > 0 ? (last20.filter(o => o.result === 'over').length / last20.length) * 100 : 0,
          average: last20.length > 0 ? last20.reduce((sum, o) => sum + o.actualValue, 0) / last20.length : 0
        }
      };

      // Calculate home/away splits
      const homeGames = outcomes.filter(o => o.home_team_id === o.player_team_id);
      const awayGames = outcomes.filter(o => o.home_team_id !== o.player_team_id);

      const homeAwayStats = {
        home: {
          hitRate: homeGames.length > 0 ? (homeGames.filter(o => o.result === 'over').length / homeGames.length) * 100 : 0,
          average: homeGames.length > 0 ? homeGames.reduce((sum, o) => sum + o.actualValue, 0) / homeGames.length : 0,
          games: homeGames.length
        },
        away: {
          hitRate: awayGames.length > 0 ? (awayGames.filter(o => o.result === 'over').length / awayGames.length) * 100 : 0,
          average: awayGames.length > 0 ? awayGames.reduce((sum, o) => sum + o.actualValue, 0) / awayGames.length : 0,
          games: awayGames.length
        }
      };

      const analysis = {
        propType,
        propLine,
        hitRate,
        average,
        overCount,
        underCount,
        totalGames,
        recentForm,
        homeAwayStats
      };

      // Cache the analysis
      cacheService.set(cacheKey, analysis, CACHE_TTL.SHORT);
      return analysis;
    } catch (error) {
      console.error('❌ Error analyzing prop:', error);
      throw error;
    }
  }

  async getGameOutcomes(
    playerId: number, 
    propType: string, 
    propLine: number, 
    filters?: PropFilter
  ): Promise<GameOutcome[]> {
    try {
      const stats = await this.getPlayerStatsWithFilters(playerId, filters);
      
      if (stats.length === 0) {
        return [];
      }
      
      return stats.map(stat => {
        const actualValue = this.getStatValue(stat, propType);
        const isHome = stat.home_team_id === stat.player_team_id;
        
        return {
          gameId: stat.game_id,
          date: stat.game_date,
          opponent: stat.opponent_name || 'Desconocido',
          isHome,
          actualValue,
          result: actualValue > propLine ? 'over' : 'under',
          minutes: stat.min
        };
      });
    } catch (error) {
      console.error('❌ Error getting game outcomes:', error);
      throw error;
    }
  }

  async calculateRollingSplits(playerId: number): Promise<void> {
    try {
      const propTypes = ['pts', 'reb', 'ast', 'stl', 'blk', 'turnover', 'pra'];
      const gamesCounts = [5, 10, 20];
      
      for (const propType of propTypes) {
        for (const gamesCount of gamesCounts) {
          const stats = await this.getPlayerStatsWithFilters(playerId, { lastNGames: gamesCount });
          
          if (stats.length === 0) continue;
          
          const values = stats.map(stat => this.getStatValue(stat, propType));
          const average = values.reduce((sum, val) => sum + val, 0) / values.length;
          
          // Calculate hit rates for common lines
          const hitRate15 = values.filter(val => val > 1.5).length / values.length * 100;
          const hitRate25 = values.filter(val => val > 2.5).length / values.length * 100;
          const hitRate35 = values.filter(val => val > 3.5).length / values.length * 100;
          
          await db.insert(rollingSplits).values({
            player_id: playerId,
            prop_type: propType,
            games_count: gamesCount,
            average: parseFloat(average.toFixed(2)),
            hit_rate_15: parseFloat(hitRate15.toFixed(2)),
            hit_rate_25: parseFloat(hitRate25.toFixed(2)),
            hit_rate_35: parseFloat(hitRate35.toFixed(2))
          } as any).onConflictDoUpdate({
            target: [rollingSplits.player_id, rollingSplits.prop_type, rollingSplits.games_count],
            set: {
              average: parseFloat(average.toFixed(2)),
              hit_rate_15: parseFloat(hitRate15.toFixed(2)),
              hit_rate_25: parseFloat(hitRate25.toFixed(2)),
              hit_rate_35: parseFloat(hitRate35.toFixed(2)),
              last_updated: new Date()
            } as any
          });
        }
      }
    } catch (error) {
      console.error('❌ Error calculating rolling splits:', error);
      throw error;
    }
  }

  async getAvailablePropTypes(): Promise<string[]> {
    return [
      'pts',      // Puntos
      'reb',      // Rebotes
      'ast',      // Asistencias
      'stl',      // Robos
      'blk',      // Bloqueos
      'turnover', // Pérdidas
      'pra',      // Puntos + Rebotes + Asistencias
      'pr',       // Puntos + Rebotes
      'pa',       // Puntos + Asistencias
      'ra',       // Rebotes + Asistencias
      'fg3m',     // Triples anotados
      'fgm',      // Tiros de campo anotados
      'ftm'       // Tiros libres anotados
    ];
  }

  getPropTypeLabel(propType: string): string {
    const labels: Record<string, string> = {
      'pts': 'Puntos',
      'reb': 'Rebotes',
      'ast': 'Asistencias',
      'stl': 'Robos',
      'blk': 'Bloqueos',
      'turnover': 'Pérdidas',
      'pra': 'Puntos + Rebotes + Asistencias',
      'pr': 'Puntos + Rebotes',
      'pa': 'Puntos + Asistencias',
      'ra': 'Rebotes + Asistencias',
      'fg3m': 'Triples Anotados',
      'fgm': 'Tiros de Campo Anotados',
      'ftm': 'Tiros Libres Anotados'
    };
    return labels[propType] || propType;
  }
}

export const propAnalyticsService = PropAnalyticsService.getInstance();