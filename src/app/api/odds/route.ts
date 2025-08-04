import { NextRequest, NextResponse } from 'next/server';
import { BalldontlieAPI } from '@balldontlie/sdk';

const api = new BalldontlieAPI({ apiKey: process.env.BALLDONTLIE_API_KEY! });

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const gameId = searchParams.get('game_id');

    if (!date && !gameId) {
      return NextResponse.json(
        { success: false, error: 'Either date or game_id parameter is required' },
        { status: 400 }
      );
    }

    const params: any = {};
    if (date) params.date = date;
    if (gameId) params.game_id = parseInt(gameId);

    const response = await api.nba.getOdds(params);

    const odds = response.data.map(odd => ({
      id: `${odd.game_id}_${odd.vendor}_${odd.type}`,
      gameId: odd.game_id,
      book: odd.vendor,
      type: odd.type,
      live: odd.live,
      oddsDecimalHome: odd.odds_decimal_home,
      oddsDecimalVisitor: odd.odds_decimal_visitor,
      oddsAmericanHome: odd.odds_american_home,
      oddsAmericanVisitor: odd.odds_american_visitor,
      spread: (odd as any).away_spread,
      overUnder: (odd as any).over_under
    }));

    return NextResponse.json({
      success: true,
      data: odds
    });

  } catch (error) {
    console.error('Error fetching odds:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch odds data' },
      { status: 500 }
    );
  }
}
