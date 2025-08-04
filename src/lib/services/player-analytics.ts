import { nbaService, NBAPlayerStat } from '@/lib/api/nba-service';
import { BalldontlieAPI } from '@balldontlie/sdk';

const api = new BalldontlieAPI({ apiKey: process.env.BALLDONTLIE_API_KEY! });

export interface PlayerAnalytics {
  playerId: number;
  propType: string;
  line: number;
  season: {
    hitRate: number;
    average: number;
    games: number;
    hits: number;
  };
  splits: {
    last5: { hitRate: number; average: number; games: number };
    last10: { hitRate: number; average: number; games: number };
    last20: { hitRate: number; average: number; games: number };
    home: { hitRate: number; average: number; games: number };
    away: { hitRate: number; average: number; games: number };
    h2h?: { hitRate: number; average: number; games: number };
  };
  chartData: GameOutcome[];
  odds?: {
    fairOdds: string;
    impliedProbability: number;
    expectedValue?: number;
  };
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

export interface PlayerFilter {
  homeAway?: 'home' | 'away';
  lastNGames?: number;
  opponentTeamId?: number;
  minMinutes?: number;
  restDays?: number;
  season?: number;
  postseason?: boolean;
}

export class PlayerAnalyticsService {
  private static instance: PlayerAnalyticsService;

  static getInstance(): PlayerAnalyticsService {
    if (!PlayerAnalyticsService.instance) {
      PlayerAnalyticsService.instance = new PlayerAnalyticsService();
    }
    return PlayerAnalyticsService.instance;
  }

  // Get stat value based on prop type
  private getStatValue(stat: any, propType: string): number {
    switch (propType.toLowerCase()) {
      case 'pts': return stat.pts || 0;
      case 'reb': return stat.reb || 0;
      case 'ast': return stat.ast || 0;
      case 'stl': return stat.stl || 0;
      case 'blk': return stat.blk || 0;
      case 'pra': return (stat.pts || 0) + (stat.reb || 0) + (stat.ast || 0);
      case 'pa': return (stat.pts || 0) + (stat.ast || 0);
      case 'pr': return (stat.pts || 0) + (stat.reb || 0);
      case 'ra': return (stat.reb || 0) + (stat.ast || 0);
      case '3ptm': return stat.fg3m || 0;
      default: return 0;
    }
  }

  // Calculate metrics for a set of games
  private calculateMetrics(games: any[], propType: string, line: number) {
    if (games.length === 0) {
      return { hitRate: 0, average: 0, games: 0, hits: 0 };
    }

    const values = games.map(game => this.getStatValue(game, propType));
    const hits = values.filter(value => value >= line).length;
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const hitRate = (hits / games.length) * 100;

    return {
      hitRate: Math.round(hitRate * 10) / 10,
      average: Math.round(average * 10) / 10,
      games: games.length,
      hits
    };
  }

  // Convert probability to American odds
  private probabilityToAmericanOdds(probability: number): string {
    if (probability >= 0.5) {
      return `-${Math.round(100 * probability / (probability - 1))}`;
    } else {
      return `+${Math.round(100 * (1 - probability) / probability)}`;
    }
  }

  // Get comprehensive player analytics
  async getPlayerAnalytics(
    playerId: number, 
    propType: string, 
    line: number,
    opponentTeamId?: number
  ): Promise<PlayerAnalytics> {
    try {
      // Fetch all games for current season (2024-25)
      const allGames = await this.fetchAllPlayerGames(playerId, 2024);
      
      if (allGames.length === 0) {
        throw new Error('No games found for player');
      }

      // Calculate season metrics
      const seasonMetrics = this.calculateMetrics(allGames, propType, line);

      // Calculate splits
      const last5Games = allGames.slice(0, 5);
      const last10Games = allGames.slice(0, 10);
      const last20Games = allGames.slice(0, 20);
      
      const homeGames = allGames.filter(game => game.isHome);
      const awayGames = allGames.filter(game => !game.isHome);
      
      let h2hGames: any[] = [];
      if (opponentTeamId) {
        h2hGames = allGames.filter(game => 
          game.opponentTeamId === opponentTeamId
        );
      }

      const splits = {
        last5: this.calculateMetrics(last5Games, propType, line),
        last10: this.calculateMetrics(last10Games, propType, line),
        last20: this.calculateMetrics(last20Games, propType, line),
        home: this.calculateMetrics(homeGames, propType, line),
        away: this.calculateMetrics(awayGames, propType, line),
        ...(h2hGames.length > 0 && {
          h2h: this.calculateMetrics(h2hGames, propType, line)
        })
      };

      // Generate chart data (last 20 games)
      const chartData: GameOutcome[] = last20Games.map(game => ({
        gameId: game.id,
        date: new Date(game.game_date),
        opponent: game.opponent,
        isHome: game.isHome,
        actualValue: this.getStatValue(game, propType),
        result: this.getStatValue(game, propType) >= line ? 'over' : 'under',
        minutes: game.min
      }));

      // Calculate fair odds
      const impliedProbability = seasonMetrics.hitRate / 100;
      const fairOdds = this.probabilityToAmericanOdds(impliedProbability);

      return {
        playerId,
        propType,
        line,
        season: seasonMetrics,
        splits,
        chartData,
        odds: {
          fairOdds,
          impliedProbability
        }
      };

    } catch (error) {
      console.error('Error getting player analytics:', error);
      throw error;
    }
  }

  // Fetch all games for a player in a season with pagination
  private async fetchAllPlayerGames(playerId: number, season: number): Promise<any[]> {
    try {
      let allStats: any[] = [];
      let cursor: string | undefined;
      
      do {
        const params: any = {
          player_ids: [playerId],
          seasons: [season],
          postseason: false,
          per_page: 100
        };
        
        if (cursor) {
          params.cursor = cursor;
        }

        const response = await api.nba.getStats(params);
        
        // Transform the data to include opponent info and home/away
        const transformedStats = response.data.map((stat: any) => ({
          id: stat.id,
          game_date: stat.game.date,
          opponent: stat.game.home_team.id === stat.player.team_id 
            ? stat.game.visitor_team.name 
            : stat.game.home_team.name,
          opponentTeamId: stat.game.home_team.id === stat.player.team_id 
            ? stat.game.visitor_team.id 
            : stat.game.home_team.id,
          isHome: stat.game.home_team.id === stat.player.team_id,
          min: stat.min,
          pts: stat.pts || 0,
          reb: stat.reb || 0,
          ast: stat.ast || 0,
          stl: stat.stl || 0,
          blk: stat.blk || 0,
          fg3m: stat.fg3m || 0,
          turnover: stat.turnover || 0
        }));

        allStats.push(...transformedStats);
        cursor = response.meta?.next_cursor as string | undefined;
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } while (cursor);

      // Sort by date (most recent first)
      return allStats.sort((a, b) => 
        new Date(b.game_date).getTime() - new Date(a.game_date).getTime()
      );

    } catch (error) {
      console.error('Error fetching player games:', error);
      throw error;
    }
  }

  // Get season averages for a player
  async getSeasonAverages(playerId: number, season: number = 2024): Promise<any> {
    try {
      // Note: Using any type due to SDK type limitations
      const response = await (api.nba as any).getSeasonAverages({
        season: season,
        season_type: 'regular',
        category: 'general',
        type: 'base',
        player_ids: [playerId]
      });

      if (response.data.length === 0) {
        return null;
      }

      const stats = (response.data[0] as any).stats;
      return {
        pts: stats.pts || 0,
        reb: stats.reb || 0,
        ast: stats.ast || 0,
        stl: stats.stl || 0,
        blk: stats.blk || 0,
        fg3m: stats.fg3m || 0,
        fgm: stats.fgm || 0,
        ftm: stats.ftm || 0,
        turnover: stats.turnover || 0,
        min: stats.min || 0,
        games_played: stats.gp || 0,
        fg_pct: stats.fg_pct || 0,
        fg3_pct: stats.fg3_pct || 0,
        ft_pct: stats.ft_pct || 0,
        // Calculated combinations
        pra: (stats.pts || 0) + (stats.reb || 0) + (stats.ast || 0),
        pr: (stats.pts || 0) + (stats.reb || 0),
        pa: (stats.pts || 0) + (stats.ast || 0),
        ra: (stats.reb || 0) + (stats.ast || 0)
      };

    } catch (error) {
      console.error('Error fetching season averages:', error);
      return null;
    }
  }

  // Calculate Expected Value given sportsbook odds
  calculateExpectedValue(
    hitRate: number, 
    sportsbookOdds: string, 
    wager: number = 100
  ): number {
    const probability = hitRate / 100;
    
    // Parse American odds
    const odds = parseInt(sportsbookOdds.replace('+', ''));
    const payout = odds > 0 ? (odds / 100) * wager : (100 / Math.abs(odds)) * wager;
    
    // EV = (probability of win * payout) - (probability of loss * wager)
    const ev = (probability * payout) - ((1 - probability) * wager);
    
    return Math.round(ev * 100) / 100;
  }
}

export const playerAnalyticsService = PlayerAnalyticsService.getInstance();
