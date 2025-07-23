import { NextRequest, NextResponse } from 'next/server';
import { BalldontlieAPI } from '@balldontlie/sdk';
import { cacheService, CacheService, CACHE_TTL } from '@/lib/services/cache-service';
import { withDbFallback } from '@/lib/db/fallback-service';
import { CACHE_KEYS } from '@/lib/storage';

const api = new BalldontlieAPI({ apiKey: process.env.BALLDONTLIE_API_KEY! });

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const playerIdsParam = searchParams.get('player_ids');
    const season = searchParams.get('season') || '2024';
    const seasonType = searchParams.get('season_type') || 'regular';
    
    if (!playerIdsParam) {
      return NextResponse.json(
        { error: 'Player IDs are required' },
        { status: 400 }
      );
    }

    // Parse player IDs from comma-separated string
    const playerIds = playerIdsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    
    if (playerIds.length === 0) {
      return NextResponse.json(
        { error: 'Valid player IDs are required' },
        { status: 400 }
      );
    }

    // Limit to 100 players per request to avoid API limits
    if (playerIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 player IDs allowed per request' },
        { status: 400 }
      );
    }

    const cacheKey = `season-averages:${season}:${seasonType}:${playerIds.sort().join(',')}`;
    
    const result = await withDbFallback(
      async () => {
        return await cacheService.getOrSet(
          cacheKey,
          async () => {
        try {
          // Fetch season averages from BallDontLie API
          // Handle multiple player IDs by making separate requests if needed
          let allSeasonAverages: any[] = [];
          
          // If only one player ID, make a single request
          if (playerIds.length === 1) {
            const response = await api.nba.getSeasonAverages({
              season: parseInt(season),
              player_id: playerIds[0]
            });
            allSeasonAverages = response.data;
          } else {
            // For multiple player IDs, make individual requests
            for (const playerId of playerIds) {
              try {
                const response = await api.nba.getSeasonAverages({
                  season: parseInt(season),
                  player_id: playerId
                });
                allSeasonAverages.push(...response.data);
                // Add small delay to respect rate limits
                await new Promise(resolve => setTimeout(resolve, 100));
              } catch (error) {
                console.warn(`Failed to fetch season averages for player ${playerId}:`, error);
                // Continue with other players
              }
            }
          }

          // Transform the response to match our expected format
          const seasonAverages = allSeasonAverages.map((avg: any) => ({
            player_id: avg.player_id,
            season: avg.season,
            games_played: avg.games_played,
            player_name: `${avg.player?.first_name || ''} ${avg.player?.last_name || ''}`.trim(),
            team_abbreviation: avg.player?.team?.abbreviation || '',
            // Basic stats
            pts: parseFloat((avg.pts || 0).toFixed(1)),
            reb: parseFloat((avg.reb || 0).toFixed(1)),
            ast: parseFloat((avg.ast || 0).toFixed(1)),
            stl: parseFloat((avg.stl || 0).toFixed(1)),
            blk: parseFloat((avg.blk || 0).toFixed(1)),
            turnover: parseFloat((avg.turnover || 0).toFixed(1)),
            // Shooting stats
            fgm: parseFloat((avg.fgm || 0).toFixed(1)),
            fga: parseFloat((avg.fga || 0).toFixed(1)),
            fg_pct: parseFloat((avg.fg_pct || 0).toFixed(3)),
            fg3m: parseFloat((avg.fg3m || 0).toFixed(1)),
            fg3a: parseFloat((avg.fg3a || 0).toFixed(1)),
            fg3_pct: parseFloat((avg.fg3_pct || 0).toFixed(3)),
            ftm: parseFloat((avg.ftm || 0).toFixed(1)),
            fta: parseFloat((avg.fta || 0).toFixed(1)),
            ft_pct: parseFloat((avg.ft_pct || 0).toFixed(3)),
            // Rebounds breakdown
            oreb: parseFloat((avg.oreb || 0).toFixed(1)),
            dreb: parseFloat((avg.dreb || 0).toFixed(1)),
            // Other stats
            pf: parseFloat((avg.pf || 0).toFixed(1)),
            min: avg.min ? parseFloat(avg.min.toFixed(1)) : 0,
            // Composite stats
            pra: parseFloat(((avg.pts || 0) + (avg.reb || 0) + (avg.ast || 0)).toFixed(1)),
            pr: parseFloat(((avg.pts || 0) + (avg.reb || 0)).toFixed(1)),
            pa: parseFloat(((avg.pts || 0) + (avg.ast || 0)).toFixed(1)),
            ra: parseFloat(((avg.reb || 0) + (avg.ast || 0)).toFixed(1))
          }));

          return {
            season: parseInt(season),
            season_type: seasonType,
            data: seasonAverages,
            total: seasonAverages.length
          };
        } catch (apiError: any) {
          console.error('BallDontLie API Error:', apiError);
          
          // Handle rate limiting
          if (apiError.status === 429) {
            throw new Error('Rate limit exceeded. Please try again later.');
          }
          
          // Handle other API errors
          throw new Error(`API Error: ${apiError.message || 'Failed to fetch season averages'}`);
          }
        },
        CACHE_TTL.LONG // Cache season averages for longer since they don't change frequently
      );
      },
      `${CACHE_KEYS.SEASON_AVERAGES}_${season}_${seasonType}_${playerIds.sort().join(',')}`,
      {
        season: parseInt(season),
        season_type: seasonType,
        data: [],
        total: 0
      }
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching season averages:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error while fetching season averages',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST endpoint for batch fetching with more complex filters
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { player_ids, season = '2024', season_type = 'regular', filters = {} } = body;
    
    if (!player_ids || !Array.isArray(player_ids)) {
      return NextResponse.json(
        { error: 'player_ids array is required' },
        { status: 400 }
      );
    }

    if (player_ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one player ID is required' },
        { status: 400 }
      );
    }

    if (player_ids.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 player IDs allowed per request' },
        { status: 400 }
      );
    }

    const cacheKey = `season-averages-post:${season}:${season_type}:${JSON.stringify(filters)}:${player_ids.sort().join(',')}`;
    
    const result = await withDbFallback(
      async () => {
        return await cacheService.getOrSet(
          cacheKey,
          async () => {
        try {
          // Handle multiple player IDs by making separate requests if needed
          let allSeasonAverages: any[] = [];
          
          // If only one player ID, make a single request
          if (player_ids.length === 1) {
            const response = await api.nba.getSeasonAverages({
              season: parseInt(season),
              player_id: player_ids[0]
            });
            allSeasonAverages = response.data;
          } else {
            // For multiple player IDs, make individual requests
            for (const playerId of player_ids) {
              try {
                const response = await api.nba.getSeasonAverages({
                  season: parseInt(season),
                  player_id: playerId
                });
                allSeasonAverages.push(...response.data);
                // Add small delay to respect rate limits
                await new Promise(resolve => setTimeout(resolve, 100));
              } catch (error) {
                console.warn(`Failed to fetch season averages for player ${playerId}:`, error);
                // Continue with other players
              }
            }
          }

          let seasonAverages = allSeasonAverages.map((avg: any) => ({
            player_id: avg.player_id,
            season: avg.season,
            games_played: avg.games_played,
            player_name: `${avg.player?.first_name || ''} ${avg.player?.last_name || ''}`.trim(),
            team_abbreviation: avg.player?.team?.abbreviation || '',
            pts: parseFloat((avg.pts || 0).toFixed(1)),
            reb: parseFloat((avg.reb || 0).toFixed(1)),
            ast: parseFloat((avg.ast || 0).toFixed(1)),
            stl: parseFloat((avg.stl || 0).toFixed(1)),
            blk: parseFloat((avg.blk || 0).toFixed(1)),
            turnover: parseFloat((avg.turnover || 0).toFixed(1)),
            fgm: parseFloat((avg.fgm || 0).toFixed(1)),
            fga: parseFloat((avg.fga || 0).toFixed(1)),
            fg_pct: parseFloat((avg.fg_pct || 0).toFixed(3)),
            fg3m: parseFloat((avg.fg3m || 0).toFixed(1)),
            fg3a: parseFloat((avg.fg3a || 0).toFixed(1)),
            fg3_pct: parseFloat((avg.fg3_pct || 0).toFixed(3)),
            ftm: parseFloat((avg.ftm || 0).toFixed(1)),
            fta: parseFloat((avg.fta || 0).toFixed(1)),
            ft_pct: parseFloat((avg.ft_pct || 0).toFixed(3)),
            oreb: parseFloat((avg.oreb || 0).toFixed(1)),
            dreb: parseFloat((avg.dreb || 0).toFixed(1)),
            pf: parseFloat((avg.pf || 0).toFixed(1)),
            min: avg.min ? parseFloat(avg.min.toFixed(1)) : 0,
            pra: parseFloat(((avg.pts || 0) + (avg.reb || 0) + (avg.ast || 0)).toFixed(1)),
            pr: parseFloat(((avg.pts || 0) + (avg.reb || 0)).toFixed(1)),
            pa: parseFloat(((avg.pts || 0) + (avg.ast || 0)).toFixed(1)),
            ra: parseFloat(((avg.reb || 0) + (avg.ast || 0)).toFixed(1))
          }));

          // Apply filters if provided
          if (filters.min_games && typeof filters.min_games === 'number') {
            seasonAverages = seasonAverages.filter(avg => avg.games_played >= filters.min_games);
          }

          if (filters.min_minutes && typeof filters.min_minutes === 'number') {
            seasonAverages = seasonAverages.filter(avg => avg.min >= filters.min_minutes);
          }

          return {
            season: parseInt(season),
            season_type: season_type,
            filters,
            data: seasonAverages,
            total: seasonAverages.length
          };
        } catch (apiError: any) {
          console.error('BallDontLie API Error:', apiError);
          
          if (apiError.status === 429) {
            throw new Error('Rate limit exceeded. Please try again later.');
          }
          
          throw new Error(`API Error: ${apiError.message || 'Failed to fetch season averages'}`);
          }
        },
        CACHE_TTL.LONG
      );
      },
      `${CACHE_KEYS.SEASON_AVERAGES}_post_${season}_${season_type}_${JSON.stringify(filters)}_${player_ids.sort().join(',')}`,
      {
        season: parseInt(season),
        season_type: season_type,
        filters,
        data: [],
        total: 0
      }
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in POST season averages:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error while fetching season averages',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}