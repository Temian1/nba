import { NextRequest, NextResponse } from 'next/server';
import { db, withTimeout } from '@/lib/db';
import { players, teams } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withDbFallback } from '@/lib/db/fallback-service';
import { CACHE_KEYS } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const playerId = parseInt(params.id);

    if (isNaN(playerId)) {
      return NextResponse.json(
        { error: 'ID de jugador inválido' },
        { status: 400 }
      );
    }

    const result = await withDbFallback(
      async () => {
        return await withTimeout(
          db
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
              teamName: teams.name,
              teamAbbreviation: teams.abbreviation,
              teamCity: teams.city,
              teamConference: teams.conference,
              teamDivision: teams.division
            })
            .from(players)
            .leftJoin(teams, eq(players.team_id, teams.id))
            .where(eq(players.id, playerId))
            .limit(1),
          5000
        );
      },
      `${CACHE_KEYS.PLAYERS}_${playerId}`,
      []
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Jugador no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      player: result[0]
    });

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
