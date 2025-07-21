import { NextRequest, NextResponse } from 'next/server';
import { NBAService } from '@/lib/api/nba-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, date, force } = body;

    const nbaService = new NBAService();

    switch (type) {
      case 'teams':
        await nbaService.syncTeams();
        return NextResponse.json({ 
          success: true, 
          message: 'Equipos sincronizados exitosamente' 
        });

      case 'players':
        await nbaService.syncActivePlayers();
        return NextResponse.json({ 
          success: true, 
          message: 'Jugadores activos sincronizados exitosamente' 
        });

      case 'games':
        if (!date) {
          return NextResponse.json(
            { error: 'Fecha requerida para sincronizar partidos' },
            { status: 400 }
          );
        }
        
        const gameDate = new Date(date);
        if (isNaN(gameDate.getTime())) {
          return NextResponse.json(
            { error: 'Formato de fecha no válido' },
            { status: 400 }
          );
        }

        const games = await nbaService.syncGamesForDate(gameDate);
        return NextResponse.json({ 
          success: true, 
          message: `${games.length} partidos sincronizados para ${gameDate.toDateString()}`,
          gamesCount: games.length
        });

      case 'stats':
        if (!date) {
          return NextResponse.json(
            { error: 'Fecha requerida para sincronizar estadísticas' },
            { status: 400 }
          );
        }
        
        const statsDate = new Date(date);
        if (isNaN(statsDate.getTime())) {
          return NextResponse.json(
            { error: 'Formato de fecha no válido' },
            { status: 400 }
          );
        }

        const stats = await nbaService.syncPlayerStatsForDate(statsDate);
        return NextResponse.json({ 
          success: true, 
          message: `${stats.length} estadísticas de jugadores sincronizadas para ${statsDate.toDateString()}`,
          statsCount: stats.length
        });

      case 'daily':
        const syncDate = date ? new Date(date) : undefined;
        if (syncDate && isNaN(syncDate.getTime())) {
          return NextResponse.json(
            { error: 'Formato de fecha no válido' },
            { status: 400 }
          );
        }

        const result = await nbaService.performDailySync(syncDate);
        return NextResponse.json({ 
          success: true, 
          message: 'Sincronización diaria completada exitosamente',
          result
        });

      case 'full':
        // Full sync: teams, players, and recent games/stats
        await nbaService.syncTeams();
        await nbaService.syncActivePlayers();
        
        // Sync last 7 days of games and stats
        const today = new Date();
        const fullSyncResults = [];
        
        for (let i = 1; i <= 7; i++) {
          const syncDate = new Date(today);
          syncDate.setDate(today.getDate() - i);
          
          try {
            const dayResult = await nbaService.performDailySync(syncDate);
            fullSyncResults.push({
              date: syncDate.toDateString(),
              ...dayResult
            });
          } catch (error) {
            console.error(`Error syncing data for ${syncDate.toDateString()}:`, error);
            fullSyncResults.push({
              date: syncDate.toDateString(),
              error: error instanceof Error ? error.message : 'Error desconocido'
            });
          }
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Sincronización completa finalizada',
          results: fullSyncResults
        });

      default:
        return NextResponse.json(
          { 
            error: 'Tipo de sincronización no válido',
            availableTypes: ['teams', 'players', 'games', 'stats', 'daily', 'full']
          },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error during sync:', error);
    
    // Handle specific API errors
    if (error instanceof Error) {
      if (error.message.includes('Rate limit')) {
        return NextResponse.json(
          { error: 'Límite de velocidad de API alcanzado. Intente nuevamente más tarde.' },
          { status: 429 }
        );
      }
      
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Clave de API no válida o faltante' },
          { status: 401 }
        );
      }
      
      if (error.message.includes('Network')) {
        return NextResponse.json(
          { error: 'Error de conexión de red. Verifique su conexión a internet.' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Error interno del servidor durante la sincronización',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// GET sync status and information
export async function GET() {
  try {
    // This could be expanded to show sync status, last sync times, etc.
    return NextResponse.json({
      availableSyncTypes: [
        {
          type: 'teams',
          description: 'Sincronizar todos los equipos de la NBA'
        },
        {
          type: 'players',
          description: 'Sincronizar jugadores activos'
        },
        {
          type: 'games',
          description: 'Sincronizar partidos para una fecha específica (requiere parámetro date)'
        },
        {
          type: 'stats',
          description: 'Sincronizar estadísticas de jugadores para una fecha específica (requiere parámetro date)'
        },
        {
          type: 'daily',
          description: 'Sincronización diaria completa (equipos, jugadores, partidos y estadísticas del día anterior)'
        },
        {
          type: 'full',
          description: 'Sincronización completa (equipos, jugadores y últimos 7 días de partidos/estadísticas)'
        }
      ],
      usage: {
        endpoint: '/api/sync',
        method: 'POST',
        body: {
          type: 'string (required)',
          date: 'string (optional, format: YYYY-MM-DD)',
          force: 'boolean (optional)'
        }
      }
    });

  } catch (error) {
    console.error('Error getting sync info:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor al obtener información de sincronización',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}