import { NextRequest, NextResponse } from 'next/server';
import { db, withTimeout } from '@/lib/db';
import { teams } from '@/lib/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { cacheService, CacheService, CACHE_TTL } from '@/lib/services/cache-service';
import { withDbFallback } from '@/lib/db/fallback-service';
import { CACHE_KEYS } from '@/lib/storage';

// Map of team abbreviations to reliable logo URLs (using official NBA CDN and other reliable sources)
const teamLogos: Record<string, string> = {
  'ATL': 'https://cdn.nba.com/logos/nba/1610612737/primary/L/logo.svg',
  'BOS': 'https://cdn.nba.com/logos/nba/1610612738/primary/L/logo.svg',
  'BKN': 'https://cdn.nba.com/logos/nba/1610612751/primary/L/logo.svg',
  'CHA': 'https://cdn.nba.com/logos/nba/1610612766/primary/L/logo.svg',
  'CHI': 'https://cdn.nba.com/logos/nba/1610612741/primary/L/logo.svg',
  'CLE': 'https://cdn.nba.com/logos/nba/1610612739/primary/L/logo.svg',
  'DAL': 'https://cdn.nba.com/logos/nba/1610612742/primary/L/logo.svg',
  'DEN': 'https://cdn.nba.com/logos/nba/1610612743/primary/L/logo.svg',
  'DET': 'https://cdn.nba.com/logos/nba/1610612765/primary/L/logo.svg',
  'GSW': 'https://cdn.nba.com/logos/nba/1610612744/primary/L/logo.svg',
  'HOU': 'https://cdn.nba.com/logos/nba/1610612745/primary/L/logo.svg',
  'IND': 'https://cdn.nba.com/logos/nba/1610612754/primary/L/logo.svg',
  'LAC': 'https://cdn.nba.com/logos/nba/1610612746/primary/L/logo.svg',
  'LAL': 'https://cdn.nba.com/logos/nba/1610612747/primary/L/logo.svg',
  'MEM': 'https://cdn.nba.com/logos/nba/1610612763/primary/L/logo.svg',
  'MIA': 'https://cdn.nba.com/logos/nba/1610612748/primary/L/logo.svg',
  'MIL': 'https://cdn.nba.com/logos/nba/1610612749/primary/L/logo.svg',
  'MIN': 'https://cdn.nba.com/logos/nba/1610612750/primary/L/logo.svg',
  'NOP': 'https://cdn.nba.com/logos/nba/1610612740/primary/L/logo.svg',
  'NYK': 'https://cdn.nba.com/logos/nba/1610612752/primary/L/logo.svg',
  'OKC': 'https://cdn.nba.com/logos/nba/1610612760/primary/L/logo.svg',
  'ORL': 'https://cdn.nba.com/logos/nba/1610612753/primary/L/logo.svg',
  'PHI': 'https://cdn.nba.com/logos/nba/1610612755/primary/L/logo.svg',
  'PHX': 'https://cdn.nba.com/logos/nba/1610612756/primary/L/logo.svg',
  'POR': 'https://cdn.nba.com/logos/nba/1610612757/primary/L/logo.svg',
  'SAC': 'https://cdn.nba.com/logos/nba/1610612758/primary/L/logo.svg',
  'SAS': 'https://cdn.nba.com/logos/nba/1610612759/primary/L/logo.svg',
  'TOR': 'https://cdn.nba.com/logos/nba/1610612761/primary/L/logo.svg',
  'UTA': 'https://cdn.nba.com/logos/nba/1610612762/primary/L/logo.svg',
  'WAS': 'https://cdn.nba.com/logos/nba/1610612764/primary/L/logo.svg'
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const conference = searchParams.get('conference');
    const division = searchParams.get('division');
    const limit = parseInt(searchParams.get('limit') || '30');
    const offset = parseInt(searchParams.get('offset') || '0');

    const cacheKey = CacheService.generateTeamsKey({ search, conference, division, limit, offset });
    
    const result = await withDbFallback(
      async () => {
        return await cacheService.getOrSet(
          cacheKey,
          async () => {
            // Build where conditions
            const conditions = [];

            // Add search functionality
            if (search && search.trim()) {
              const searchTerm = `%${search.trim().toLowerCase()}%`;
              conditions.push(
                sql`(
                  LOWER(${teams.full_name}) LIKE ${searchTerm} OR 
                  LOWER(${teams.name}) LIKE ${searchTerm} OR 
                  LOWER(${teams.abbreviation}) LIKE ${searchTerm} OR
                  LOWER(${teams.city}) LIKE ${searchTerm}
                )`
              );
            }

            // Filter by conference
            if (conference && conference.trim()) {
              conditions.push(eq(teams.conference, conference.trim()));
            }

            // Filter by division
            if (division && division.trim()) {
              conditions.push(eq(teams.division, division.trim()));
            }

            // Build the query
            let query = db
              .select({
                id: teams.id,
                abbreviation: teams.abbreviation,
                city: teams.city,
                conference: teams.conference,
                division: teams.division,
                fullName: teams.full_name,
                name: teams.name
              })
              .from(teams);

            // Apply conditions if any
             if (conditions.length > 0) {
               query = (query as any).where(and(...conditions));
             }

            // Order by conference, division, city
              query = (query as any).orderBy(teams.conference, teams.division, teams.city)
                .limit(limit)
                .offset(offset);

            const queryResult = await withTimeout(query, 5000);

            // Get total count for pagination
            let countQuery = db
              .select({ count: sql<number>`count(*)` })
              .from(teams);

            if (conditions.length > 0) {
              countQuery = (countQuery as any).where(and(...conditions));
            }

            const [{ count }] = await countQuery;

            // Add logo to each team
            const teamsWithLogos = queryResult.map(team => ({
              ...team,
              logo: teamLogos[team.abbreviation] || ''
            }));

            return {
              teams: teamsWithLogos,
              pagination: {
                total: count,
                limit,
                offset,
                hasMore: offset + limit < count
              }
            };
          },
          CACHE_TTL.MEDIUM // Teams data with filters cached for medium duration
        );
      },
      `${CACHE_KEYS.TEAMS}_${cacheKey}`,
      {
        teams: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false
        }
      }
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor al obtener equipos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// GET specific team by ID
export async function POST(request: NextRequest) {
  try {
    const { teamId } = await request.json();

    if (!teamId) {
      return NextResponse.json(
        { error: 'ID de equipo requerido' },
        { status: 400 }
      );
    }

    const result = await withDbFallback(
      async () => {
        return await db
          .select({
            id: teams.id,
            abbreviation: teams.abbreviation,
            city: teams.city,
            conference: teams.conference,
            division: teams.division,
            fullName: teams.full_name,
            name: teams.name
          })
          .from(teams)
          .where(eq(teams.id, teamId))
          .limit(1);
      },
      `${CACHE_KEYS.TEAMS}_${teamId}`,
      []
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      );
    }

    // Add logo to team
    const teamWithLogo = {
      ...result[0],
      logo: teamLogos[result[0].abbreviation] || ''
    };

    return NextResponse.json({ team: teamWithLogo });

  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor al obtener equipo',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}