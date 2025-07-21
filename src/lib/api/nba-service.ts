import { BalldontlieAPI } from '@balldontlie/sdk';
import { db } from '../db';
import { teams, players, games, playerStats, propOutcomes } from '../db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { format, subDays, parseISO } from 'date-fns';

const api = new BalldontlieAPI({ apiKey: process.env.BALLDONTLIE_API_KEY! });

export interface NBAPlayer {
  id: number;
  first_name: string;
  last_name: string;
  position?: string;
  height?: string;
  weight?: string;
  jersey_number?: string;
  college?: string;
  country?: string;
  draft_year?: number;
  draft_round?: number;
  draft_number?: number;
  team?: {
    id: number;
    name: string;
    abbreviation: string;
    city: string;
    conference: string;
    division: string;
    full_name: string;
  };
}

export interface NBAGame {
  id: number;
  date: string;
  season: number;
  status: string;
  period?: number;
  time?: string;
  postseason: boolean;
  home_team: {
    id: number;
    name: string;
    abbreviation: string;
    city: string;
    conference: string;
    division: string;
    full_name: string;
  };
  visitor_team: {
    id: number;
    name: string;
    abbreviation: string;
    city: string;
    conference: string;
    division: string;
    full_name: string;
  };
  home_team_score?: number;
  visitor_team_score?: number;
}

export interface NBAPlayerStat {
  id: number;
  min?: string;
  fgm?: number;
  fga?: number;
  fg_pct?: number;
  fg3m?: number;
  fg3a?: number;
  fg3_pct?: number;
  ftm?: number;
  fta?: number;
  ft_pct?: number;
  oreb?: number;
  dreb?: number;
  reb?: number;
  ast?: number;
  stl?: number;
  blk?: number;
  turnover?: number;
  pf?: number;
  pts?: number;
  plus_minus?: number;
  player: NBAPlayer;
  game: NBAGame;
  team: {
    id: number;
    name: string;
    abbreviation: string;
    city: string;
    conference: string;
    division: string;
    full_name: string;
  };
}

export class NBAService {
  private static instance: NBAService;
  private rateLimitDelay = 1000; // 1 second between requests to respect rate limits

  static getInstance(): NBAService {
    if (!NBAService.instance) {
      NBAService.instance = new NBAService();
    }
    return NBAService.instance;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async handleApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
    try {
      const result = await apiCall();
      await this.delay(this.rateLimitDelay);
      return result;
    } catch (error: any) {
      if (error.status === 429) {
        console.log('Rate limit hit, waiting 60 seconds...');
        await this.delay(60000);
        return this.handleApiCall(apiCall);
      }
      throw error;
    }
  }

  async syncTeams(): Promise<void> {
    console.log('🏀 Syncing teams...');
    try {
      const response = await this.handleApiCall(() => api.nba.getTeams({}));
      
      for (const team of response.data) {
        await db.insert(teams).values({
          id: team.id,
          name: team.name,
          abbreviation: team.abbreviation,
          city: team.city,
          conference: team.conference,
          division: team.division,
          full_name: team.full_name
        }).onConflictDoUpdate({
          target: teams.id,
          set: {
            name: team.name,
            abbreviation: team.abbreviation,
            city: team.city,
            conference: team.conference,
            division: team.division,
            full_name: team.full_name,
            updated_at: new Date()
          }
        });
      }
      console.log(`✅ Synced ${response.data.length} teams`);
    } catch (error) {
      console.error('❌ Error syncing teams:', error);
      throw error;
    }
  }

  async syncActivePlayers(): Promise<void> {
    console.log('👥 Syncing active players...');
    try {
      let cursor: string | undefined;
      let totalPlayers = 0;

      do {
        const response = await this.handleApiCall(() => 
          api.nba.getPlayers({ 
            per_page: 100,
            cursor: cursor ? parseInt(cursor) : undefined
          })
        ) as any;

        for (const player of response.data) {
          await db.insert(players).values({
            id: player.id,
            first_name: player.first_name,
            last_name: player.last_name,
            position: player.position,
            height: player.height,
            weight: player.weight,
            jersey_number: player.jersey_number,
            college: player.college,
            country: player.country,
            draft_year: player.draft_year,
            draft_round: player.draft_round,
            draft_number: player.draft_number,
            team_id: player.team?.id,
            is_active: true
          }).onConflictDoUpdate({
            target: players.id,
            set: {
              first_name: player.first_name,
              last_name: player.last_name,
              position: player.position,
              height: player.height,
              weight: player.weight,
              jersey_number: player.jersey_number,
              college: player.college,
              country: player.country,
              draft_year: player.draft_year,
              draft_round: player.draft_round,
              draft_number: player.draft_number,
              team_id: player.team?.id,
              is_active: true,
              updated_at: new Date()
            }
          });
        }

        totalPlayers += response.data.length;
        cursor = response.meta.next_cursor as string | undefined;
        console.log(`📊 Processed ${totalPlayers} players...`);
      } while (cursor);

      console.log(`✅ Synced ${totalPlayers} active players`);
    } catch (error) {
      console.error('❌ Error syncing players:', error);
      throw error;
    }
  }

  async syncGamesForDate(date: Date): Promise<void> {
    const dateStr = format(date, 'yyyy-MM-dd');
    console.log(`🏀 Syncing games for ${dateStr}...`);
    
    try {
      let cursor: string | undefined;
      let totalGames = 0;

      do {
        const response = await this.handleApiCall(() => 
          api.nba.getGames({
            dates: [dateStr],
            per_page: 25,
            cursor: cursor ? parseInt(cursor) : undefined
          })
        ) as any;

        for (const game of response.data) {
          await db.insert(games).values({
            id: game.id,
            date: parseISO(game.date),
            season: game.season,
            status: game.status,
            period: game.period,
            time: game.time,
            postseason: game.postseason,
            home_team_id: game.home_team.id,
            visitor_team_id: game.visitor_team.id,
            home_team_score: game.home_team_score,
            visitor_team_score: game.visitor_team_score
          }).onConflictDoUpdate({
            target: games.id,
            set: {
              status: game.status,
              period: game.period,
              time: game.time,
              home_team_score: game.home_team_score,
              visitor_team_score: game.visitor_team_score,
              updated_at: new Date()
            }
          });
        }

        totalGames += response.data.length;
        cursor = response.meta.next_cursor as string | undefined;
      } while (cursor);

      console.log(`✅ Synced ${totalGames} games for ${dateStr}`);
    } catch (error) {
      console.error(`❌ Error syncing games for ${dateStr}:`, error);
      throw error;
    }
  }

  async syncPlayerStatsForDate(date: Date): Promise<void> {
    const dateStr = format(date, 'yyyy-MM-dd');
    console.log(`📊 Syncing player stats for ${dateStr}...`);
    
    try {
      let cursor: string | undefined;
      let totalStats = 0;

      do {
        const response = await this.handleApiCall(() => 
          api.nba.getStats({
            dates: [dateStr],
            per_page: 100,
            cursor: cursor ? parseInt(cursor) : undefined
          })
        ) as any;

        for (const stat of response.data) {
          await db.insert(playerStats).values({
            player_id: stat.player.id,
            game_id: stat.game.id,
            team_id: stat.team.id,
            min: stat.min,
            fgm: stat.fgm,
            fga: stat.fga,
            fg_pct: stat.fg_pct ? parseFloat(stat.fg_pct.toString()) : null,
            fg3m: stat.fg3m,
            fg3a: stat.fg3a,
            fg3_pct: stat.fg3_pct ? parseFloat(stat.fg3_pct.toString()) : null,
            ftm: stat.ftm,
            fta: stat.fta,
            ft_pct: stat.ft_pct ? parseFloat(stat.ft_pct.toString()) : null,
            oreb: stat.oreb,
            dreb: stat.dreb,
            reb: stat.reb,
            ast: stat.ast,
            stl: stat.stl,
            blk: stat.blk,
            turnover: stat.turnover,
            pf: stat.pf,
            pts: stat.pts,
            plus_minus: stat.plus_minus
          } as any).onConflictDoNothing();
        }

        totalStats += response.data.length;
        cursor = response.meta.next_cursor as string | undefined;
        console.log(`📈 Processed ${totalStats} player stats...`);
      } while (cursor);

      console.log(`✅ Synced ${totalStats} player stats for ${dateStr}`);
    } catch (error) {
      console.error(`❌ Error syncing player stats for ${dateStr}:`, error);
      throw error;
    }
  }

  async syncDailyData(): Promise<void> {
    const yesterday = subDays(new Date(), 1);
    
    try {
      // Sync teams first (if not already done)
      await this.syncTeams();
      
      // Sync active players
      await this.syncActivePlayers();
      
      // Sync games for yesterday
      await this.syncGamesForDate(yesterday);
      
      // Sync player stats for yesterday
      await this.syncPlayerStatsForDate(yesterday);
      
      console.log('🎉 Daily data sync completed successfully!');
    } catch (error) {
      console.error('❌ Daily data sync failed:', error);
      throw error;
    }
  }

  async getActivePlayersWithTeam(): Promise<any[]> {
    try {
      const result = await db
        .select({
          id: players.id,
          first_name: players.first_name,
          last_name: players.last_name,
          position: players.position,
          team_name: teams.name,
          team_abbreviation: teams.abbreviation
        })
        .from(players)
        .leftJoin(teams, eq(players.team_id, teams.id))
        .where(eq(players.is_active, true))
        .orderBy(players.last_name, players.first_name);
      
      return result;
    } catch (error) {
      console.error('❌ Error fetching active players:', error);
      throw error;
    }
  }

  async getPlayerStats(playerId: number, filters?: {
    homeAway?: 'home' | 'away';
    minMinutes?: number;
    lastNGames?: number;
    opponentTeamId?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any[]> {
    try {
      // Build conditions array
      const conditions = [eq(playerStats.player_id, playerId)];
      
      if (filters?.startDate) {
        conditions.push(gte(games.date, filters.startDate));
      }

      if (filters?.endDate) {
        conditions.push(lte(games.date, filters.endDate));
      }

      const query = db
        .select({
          id: playerStats.id,
          game_date: games.date,
          opponent: teams.name,
          is_home: games.home_team_id,
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
        .innerJoin(teams, eq(games.visitor_team_id, teams.id))
        .where(and(...conditions));

      const result = await query
        .orderBy(desc(games.date))
        .limit(filters?.lastNGames || 100);

      return result;
    } catch (error) {
      console.error('❌ Error fetching player stats:', error);
      throw error;
    }
  }
}

export const nbaService = NBAService.getInstance();