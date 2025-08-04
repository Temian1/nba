import { NextRequest, NextResponse } from 'next/server';
import { playerAnalyticsService } from '@/lib/services/player-analytics';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = parseInt(searchParams.get('playerId') || '0');
    const propType = searchParams.get('propType') || 'pts';
    const line = parseFloat(searchParams.get('line') || '20');
    const opponentTeamId = searchParams.get('opponentTeamId') 
      ? parseInt(searchParams.get('opponentTeamId')!) 
      : undefined;

    if (!playerId) {
      return NextResponse.json(
        { success: false, error: 'playerId parameter is required' },
        { status: 400 }
      );
    }

    const analytics = await playerAnalyticsService.getPlayerAnalytics(
      playerId,
      propType,
      line,
      opponentTeamId
    );

    return NextResponse.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error fetching player analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch player analytics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId, propType, line, sportsbookOdds, wager = 100 } = body;

    if (!playerId || !propType || !line || !sportsbookOdds) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get analytics first
    const analytics = await playerAnalyticsService.getPlayerAnalytics(
      playerId,
      propType,
      line
    );

    // Calculate Expected Value
    const ev = playerAnalyticsService.calculateExpectedValue(
      analytics.season.hitRate,
      sportsbookOdds,
      wager
    );

    return NextResponse.json({
      success: true,
      data: {
        ...analytics,
        expectedValue: ev,
        sportsbookOdds,
        wager
      }
    });

  } catch (error) {
    console.error('Error calculating EV:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate expected value' },
      { status: 500 }
    );
  }
}
