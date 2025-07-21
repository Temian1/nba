import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { players, teams } from '@/lib/db/schema';
import { eq, and, isNotNull, sql } from 'drizzle-orm';
import { cacheService, CacheService, CACHE_TTL } from '@/lib/services/cache-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('active') === 'true';
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const filters = { activeOnly, search, limit, offset };
    const cacheKey = CacheService.generatePlayersKey(filters);

    let query = db
      .select({
        id: players.id,
        firstName: players.first_name,
        lastName: players.last_name,
        position: players.position,
        height: players.height,
        weight: players.weight,
        jerseyNumber: players.jersey_number,
        college: players.college,
        country: players.country,
        draftYear: players.draft_year,
        draftRound: players.draft_round,
        draftNumber: players.draft_number,
        teamId: players.team_id,
        teamName: teams.full_name,
        teamAbbreviation: teams.abbreviation,
        teamCity: teams.city,
        teamConference: teams.conference,
        teamDivision: teams.division
      })
      .from(players)
      .leftJoin(teams, eq(players.team_id, teams.id))
      .limit(limit)
      .offset(offset);

    // Filter for active players (those with a team)
    if (activeOnly) {
      query = query.where(isNotNull(players.team_id));
    }

    // Add search functionality
    if (search && search.trim()) {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      query = query.where(
        sql`(
          LOWER(${players.first_name}) LIKE ${searchTerm} OR 
          LOWER(${players.last_name}) LIKE ${searchTerm} OR 
          LOWER(CONCAT(${players.first_name}, ' ', ${players.last_name})) LIKE ${searchTerm} OR
          LOWER(${teams.full_name}) LIKE ${searchTerm} OR
          LOWER(${teams.abbreviation}) LIKE ${searchTerm} OR
          LOWER(${teams.city}) LIKE ${searchTerm}
        )`
      );
    }

    // Order by last name, first name
    query = query.orderBy(players.last_name, players.first_name);

    const result = await cacheService.getOrSet(
      cacheKey,
      async () => {
        // Get total count for pagination
        let countQuery = db
          .select({ count: sql<number>`count(*)` })
          .from(players)
          .leftJoin(teams, eq(players.team_id, teams.id));

        if (activeOnly) {
          countQuery = countQuery.where(isNotNull(players.team_id));
        }

        if (search && search.trim()) {
          const searchTerm = `%${search.trim().toLowerCase()}%`;
          countQuery = countQuery.where(
            sql`(
              LOWER(${players.first_name}) LIKE ${searchTerm} OR 
              LOWER(${players.last_name}) LIKE ${searchTerm} OR 
              LOWER(CONCAT(${players.first_name}, ' ', ${players.last_name})) LIKE ${searchTerm} OR
              LOWER(${teams.full_name}) LIKE ${searchTerm} OR
              LOWER(${teams.abbreviation}) LIKE ${searchTerm} OR
              LOWER(${teams.city}) LIKE ${searchTerm}
            )`
          );
        }

        const [{ count }] = await countQuery;
        const queryResult = await query;

        return {
          players: queryResult,
          pagination: {
            total: count,
            limit,
            offset,
            hasMore: offset + limit < count
          }
        };
      },
      CACHE_TTL.MEDIUM // Players data cached for medium duration
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor al obtener jugadores',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// GET specific player by ID
export async function POST(request: NextRequest) {
  try {
    const { playerId } = await request.json();

    if (!playerId) {
      return NextResponse.json(
        { error: 'ID de jugador requerido' },
        { status: 400 }
      );
    }

    const result = await db
      .select({
        id: players.id,
        firstName: players.first_name,
        lastName: players.last_name,
        position: players.position,
        height: players.height,
        weight: players.weight,
        jerseyNumber: players.jersey_number,
        college: players.college,
        country: players.country,
        draftYear: players.draft_year,
        draftRound: players.draft_round,
        draftNumber: players.draft_number,
        teamId: players.team_id,
        teamName: teams.full_name,
        teamAbbreviation: teams.abbreviation,
        teamCity: teams.city,
        teamConference: teams.conference,
        teamDivision: teams.division
      })
      .from(players)
      .leftJoin(teams, eq(players.team_id, teams.id))
      .where(eq(players.id, playerId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Jugador no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ player: result[0] });

  } catch (error) {
    console.error('Error fetching player:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor al obtener jugador',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}