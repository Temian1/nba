import { NextRequest, NextResponse } from 'next/server';
import { advancedAnalyticsService } from '@/lib/services/advanced-analytics';
import { z } from 'zod';

// Validation schemas
const opponentTrendsSchema = z.object({
  propType: z.string(),
  season: z.string().optional().default('2023-24')
});

const seasonComparisonSchema = z.object({
  playerId: z.coerce.number(),
  propType: z.string(),
  season: z.string().optional().default('2023-24')
});

const advancedMetricsSchema = z.object({
  playerId: z.coerce.number(),
  propType: z.string(),
  season: z.string().optional().default('2023-24')
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    switch (endpoint) {
      case 'opponent-trends': {
        const validation = opponentTrendsSchema.safeParse({
          propType: searchParams.get('propType'),
          season: searchParams.get('season')
        });

        if (!validation.success) {
          return NextResponse.json(
            { error: 'Invalid parameters', details: validation.error.errors },
            { status: 400 }
          );
        }

        const { propType, season } = validation.data;
        const trends = await advancedAnalyticsService.getOpponentTrends(propType, season);
        
        return NextResponse.json({ trends });
      }

      case 'season-comparison': {
        const validation = seasonComparisonSchema.safeParse({
          playerId: searchParams.get('playerId'),
          propType: searchParams.get('propType'),
          season: searchParams.get('season')
        });

        if (!validation.success) {
          return NextResponse.json(
            { error: 'Invalid parameters', details: validation.error.errors },
            { status: 400 }
          );
        }

        const { playerId, propType, season } = validation.data;
        const comparison = await advancedAnalyticsService.getSeasonComparison(playerId, propType, season);
        
        return NextResponse.json({ comparison });
      }

      case 'advanced-metrics': {
        const validation = advancedMetricsSchema.safeParse({
          playerId: searchParams.get('playerId'),
          propType: searchParams.get('propType'),
          season: searchParams.get('season')
        });

        if (!validation.success) {
          return NextResponse.json(
            { error: 'Invalid parameters', details: validation.error.errors },
            { status: 400 }
          );
        }

        const { playerId, propType, season } = validation.data;
        const metrics = await advancedAnalyticsService.getAdvancedMetrics(playerId, propType, season);
        
        return NextResponse.json({ metrics });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid endpoint. Use: opponent-trends, season-comparison, or advanced-metrics' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Advanced analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST endpoint for batch requests
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requests } = body;

    if (!Array.isArray(requests)) {
      return NextResponse.json(
        { error: 'Requests must be an array' },
        { status: 400 }
      );
    }

    const results = await Promise.allSettled(
      requests.map(async (req: any) => {
        switch (req.type) {
          case 'opponent-trends':
            return {
              type: 'opponent-trends',
              data: await advancedAnalyticsService.getOpponentTrends(req.propType, req.season)
            };
          
          case 'season-comparison':
            return {
              type: 'season-comparison',
              data: await advancedAnalyticsService.getSeasonComparison(req.playerId, req.propType, req.season)
            };
          
          case 'advanced-metrics':
            return {
              type: 'advanced-metrics',
              data: await advancedAnalyticsService.getAdvancedMetrics(req.playerId, req.propType, req.season)
            };
          
          default:
            throw new Error(`Unknown request type: ${req.type}`);
        }
      })
    );

    const response = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return { success: true, ...result.value };
      } else {
        return { 
          success: false, 
          error: result.reason.message,
          request: requests[index]
        };
      }
    });

    return NextResponse.json({ results: response });
  } catch (error) {
    console.error('Advanced analytics batch API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}