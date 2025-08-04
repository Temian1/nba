import { NextRequest, NextResponse } from 'next/server';
import { BalldontlieAPI } from '@balldontlie/sdk';

const api = new BalldontlieAPI({ apiKey: process.env.BALLDONTLIE_API_KEY! });

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamIds = searchParams.getAll('team_ids[]').map(id => parseInt(id));
    const playerIds = searchParams.getAll('player_ids[]').map(id => parseInt(id));

    const params: any = {};
    if (teamIds.length > 0) params.team_ids = teamIds;
    if (playerIds.length > 0) params.player_ids = playerIds;

    const response = await api.nba.getPlayerInjuries(params);

    const injuries = response.data.map(injury => ({
      id: injury.player.id,
      player: `${injury.player.first_name} ${injury.player.last_name}`,
      status: injury.status,
      description: injury.description,
      returnDate: injury.return_date,
      team: (injury.player as any).team_id
    }));

    return NextResponse.json({
      success: true,
      data: injuries
    });

  } catch (error) {
    console.error('Error fetching injuries:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch injury data' },
      { status: 500 }
    );
  }
}
