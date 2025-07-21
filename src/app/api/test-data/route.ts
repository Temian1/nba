import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { teams, players } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Adding test data to database...');
    
    // Insert a few test teams
    const testTeams = [
      {
        id: 1,
        name: 'Lakers',
        abbreviation: 'LAL',
        city: 'Los Angeles',
        conference: 'West',
        division: 'Pacific',
        full_name: 'Los Angeles Lakers'
      },
      {
        id: 2,
        name: 'Warriors',
        abbreviation: 'GSW',
        city: 'Golden State',
        conference: 'West',
        division: 'Pacific',
        full_name: 'Golden State Warriors'
      },
      {
        id: 3,
        name: 'Celtics',
        abbreviation: 'BOS',
        city: 'Boston',
        conference: 'East',
        division: 'Atlantic',
        full_name: 'Boston Celtics'
      }
    ];
    
    for (const team of testTeams) {
      await db.insert(teams).values(team).onConflictDoNothing();
    }
    
    // Insert a few test players
    const testPlayers = [
      {
        id: 1,
        first_name: 'LeBron',
        last_name: 'James',
        position: 'F',
        height: '6-9',
        weight: 250,
        jersey_number: 23,
        team_id: 1,
        is_active: true
      },
      {
        id: 2,
        first_name: 'Stephen',
        last_name: 'Curry',
        position: 'G',
        height: '6-2',
        weight: 185,
        jersey_number: 30,
        team_id: 2,
        is_active: true
      },
      {
        id: 3,
        first_name: 'Jayson',
        last_name: 'Tatum',
        position: 'F',
        height: '6-8',
        weight: 210,
        jersey_number: 0,
        team_id: 3,
        is_active: true
      }
    ];
    
    for (const player of testPlayers) {
      await db.insert(players).values(player).onConflictDoNothing();
    }
    
    console.log('✅ Test data added successfully!');
    
    return NextResponse.json({
      success: true,
      message: 'Test data added successfully',
      data: {
        teams: testTeams.length,
        players: testPlayers.length
      }
    });
    
  } catch (error) {
    console.error('❌ Error adding test data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to add test data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}