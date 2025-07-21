import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { teams } from '@/lib/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { cacheService, CacheService, CACHE_TTL } from '@/lib/services/cache-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const conference = searchParams.get('conference');
    const division = searchParams.get('division');
    const limit = parseInt(searchParams.get('limit') || '30');
    const offset = parseInt(searchParams.get('offset') || '0');

    const cacheKey = CacheService.generateTeamsKey({ search, conference, division, limit, offset });
    
    const result = await cacheService.getOrSet(
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

        const queryResult = await query;

        // Get total count for pagination
        let countQuery = db
          .select({ count: sql<number>`count(*)` })
          .from(teams);

        if (conditions.length > 0) {
          countQuery = (countQuery as any).where(and(...conditions));
        }

        const [{ count }] = await countQuery;

        return {
          teams: queryResult,
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

    const result = await db
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

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ team: result[0] });

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