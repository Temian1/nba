import { NextRequest, NextResponse } from 'next/server';
import { nbaService } from '@/lib/api/nba-service';

// Helper function to calculate hit rate for a specific line
function calculateHitRate(stats: any[], propType: string, line: number): number {
  if (stats.length === 0) return 0;
  
  const hits = stats.filter(stat => {
    const value = getStatValue(stat, propType);
    return value >= line;
  }).length;
  
  return (hits / stats.length) * 100;
}

// Helper function to get stat value based on prop type
function getStatValue(stat: any, propType: string): number {
  switch (propType.toLowerCase()) {
    case 'pts': return stat.pts || 0;
    case 'reb': return stat.reb || 0;
    case 'ast': return stat.ast || 0;
    case 'pra': return (stat.pts || 0) + (stat.reb || 0) + (stat.ast || 0);
    case 'pa': return (stat.pts || 0) + (stat.ast || 0);
    case 'pr': return (stat.pts || 0) + (stat.reb || 0);
    case 'ra': return (stat.reb || 0) + (stat.ast || 0);
    case '3ptm': return stat.fg3m || 0;
    default: return 0;
  }
}

// Helper function to convert probability to American odds
function probabilityToAmericanOdds(probability: number): string {
  if (probability >= 0.5) {
    return `-${Math.round(100 * probability / (probability - 1))}`;
  } else {
    return `+${Math.round(100 * (1 - probability) / probability)}`;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = parseInt(searchParams.get('playerId') || '0');
    const propType = searchParams.get('propType') || 'pts';
    const baseLine = parseFloat(searchParams.get('baseLine') || '20');

    if (!playerId) {
      return NextResponse.json(
        { success: false, error: 'playerId parameter is required' },
        { status: 400 }
      );
    }

    // Get player stats for the current season
    const stats = await nbaService.getPlayerStats(playerId, {
      startDate: new Date('2024-10-01'),
      endDate: new Date()
    });

    // Generate alternative lines around the base line
    const lines = [];
    const lineStep = propType === 'pts' ? 1.5 : propType === 'reb' || propType === 'ast' ? 1 : 0.5;
    
    for (let i = -4; i <= 4; i++) {
      const line = baseLine + (i * lineStep);
      if (line > 0) {
        const hitRate = calculateHitRate(stats, propType, line);
        const probability = hitRate / 100;
        const odds = probabilityToAmericanOdds(probability);
        
        lines.push({
          id: `${playerId}_${propType}_${line}`,
          line: line,
          odds: odds,
          hitRate: Math.round(hitRate),
          propType: propType,
          games: stats.length
        });
      }
    }

    // Sort by line value
    lines.sort((a, b) => a.line - b.line);

    return NextResponse.json({
      success: true,
      data: lines
    });

  } catch (error) {
    console.error('Error calculating alt lines:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate alternative lines' },
      { status: 500 }
    );
  }
}
