import { NextRequest, NextResponse } from 'next/server';
import { PropAnalyticsService } from '@/lib/services/prop-analytics';
import { withDbFallback } from '@/lib/db/fallback-service';
import { CACHE_KEYS } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId, propType, propLine, filters } = body;

    // Validate required parameters
    if (!playerId) {
      return NextResponse.json(
        { error: 'ID de jugador requerido' },
        { status: 400 }
      );
    }

    if (!propType) {
      return NextResponse.json(
        { error: 'Tipo de prop requerido' },
        { status: 400 }
      );
    }

    if (propLine === undefined || propLine === null) {
      return NextResponse.json(
        { error: 'Línea de prop requerida' },
        { status: 400 }
      );
    }

    // Validate prop line is a number
    const numericPropLine = parseFloat(propLine);
    if (isNaN(numericPropLine)) {
      return NextResponse.json(
        { error: 'La línea de prop debe ser un número válido' },
        { status: 400 }
      );
    }

    // Validate prop type
    const propAnalytics = new PropAnalyticsService();
    const availablePropTypes = await withDbFallback(
      async () => {
        return await propAnalytics.getAvailablePropTypes();
      },
      `${CACHE_KEYS.PROP_ANALYSIS}_available_types`,
      ['pts', 'reb', 'ast'] // Default prop types
    );
    if (!availablePropTypes.includes(propType)) {
      return NextResponse.json(
        { 
          error: 'Tipo de prop no válido',
          availableTypes: availablePropTypes
        },
        { status: 400 }
      );
    }

    // Parse and validate filters
    const parsedFilters = {
      startDate: filters?.startDate || undefined,
      endDate: filters?.endDate || undefined,
      homeAway: filters?.homeAway || undefined,
      minMinutes: filters?.minMinutes ? parseInt(filters.minMinutes) : undefined,
      opponent: filters?.opponent || undefined,
      lastNGames: filters?.lastNGames ? parseInt(filters.lastNGames) : undefined
    };

    // Validate date filters
    if (parsedFilters.startDate && isNaN(Date.parse(parsedFilters.startDate))) {
      return NextResponse.json(
        { error: 'Fecha de inicio no válida' },
        { status: 400 }
      );
    }

    if (parsedFilters.endDate && isNaN(Date.parse(parsedFilters.endDate))) {
      return NextResponse.json(
        { error: 'Fecha de fin no válida' },
        { status: 400 }
      );
    }

    // Validate numeric filters
    if (parsedFilters.minMinutes !== undefined && (isNaN(parsedFilters.minMinutes) || parsedFilters.minMinutes < 0)) {
      return NextResponse.json(
        { error: 'Minutos mínimos debe ser un número válido mayor o igual a 0' },
        { status: 400 }
      );
    }

    if (parsedFilters.lastNGames !== undefined && (isNaN(parsedFilters.lastNGames) || parsedFilters.lastNGames < 1)) {
      return NextResponse.json(
        { error: 'Últimos N partidos debe ser un número válido mayor a 0' },
        { status: 400 }
      );
    }

    // Validate homeAway filter
    if (parsedFilters.homeAway && !['home', 'away'].includes(parsedFilters.homeAway)) {
      return NextResponse.json(
        { error: 'Filtro local/visitante debe ser "home" o "away"' },
        { status: 400 }
      );
    }

    // Analyze the prop with fallback
    const cacheKey = `${CACHE_KEYS.PROP_ANALYSIS}_${playerId}_${propType}_${numericPropLine}_${JSON.stringify(parsedFilters)}`;
    
    const analysis = await withDbFallback(
      async () => {
        return await propAnalytics.analyzeProp(
          parseInt(playerId),
          propType,
          numericPropLine,
          parsedFilters
        );
      },
      cacheKey,
      {
          propType,
          propLine: numericPropLine,
          noDataAvailable: true,
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
          }
        }
    );

    // Get game outcomes for detailed view with fallback
    const gameOutcomes = await withDbFallback(
      async () => {
        return await propAnalytics.getGameOutcomes(
          parseInt(playerId),
          propType,
          numericPropLine,
          parsedFilters
        );
      },
      `${cacheKey}_outcomes`,
      []
    );

    return NextResponse.json({
      analysis,
      gameOutcomes,
      filters: parsedFilters,
      propTypeLabel: propAnalytics.getPropTypeLabel(propType),
      noDataAvailable: analysis.noDataAvailable || false
    });

  } catch (error) {
    console.error('Error analyzing prop:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Player not found')) {
        return NextResponse.json(
          { error: 'Jugador no encontrado' },
          { status: 404 }
        );
      }
      
      if (error.message.includes('No stats found')) {
        return NextResponse.json(
          { error: 'No se encontraron estadísticas para este jugador con los filtros aplicados' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Error interno del servidor al analizar prop',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// GET available prop types
export async function GET() {
  try {
    const propAnalytics = new PropAnalyticsService();
    const availablePropTypes = await propAnalytics.getAvailablePropTypes();
    
    const propTypesWithLabels = availablePropTypes.map(propType => ({
      value: propType,
      label: propAnalytics.getPropTypeLabel(propType)
    }));

    return NextResponse.json({
      propTypes: propTypesWithLabels
    });

  } catch (error) {
    console.error('Error fetching prop types:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor al obtener tipos de props',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}