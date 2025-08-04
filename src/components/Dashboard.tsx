'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ArrowUpDown, User, LogOut } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import { BalldontlieAPI } from '@balldontlie/sdk';

interface Player {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  team?: {
    id: number;
    name: string;
    abbreviation: string;
    city: string;
  };
}

interface GameStat {
  id: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  fg3m: number;
  min: string;
  game: {
    id: number;
    date: string;
    home_team: { id: number; abbreviation: string };
    visitor_team: { id: number; abbreviation: string };
  };
  team: {
    id: number;
    abbreviation: string;
  };
}

interface SeasonAverages {
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  fg3m: number;
  min: number;
  games_played: number;
}

interface PropBet {
  id: string;
  player: Player;
  propType: string;
  line: number;
  overOdds: number;
  underOdds: number;
  streak: number;
  season2425: number;
  h2h: number;
  l5: number;
  l10: number;
  l20: number;
  season2324: number;
  projected: number;
  difference: number;
  dvpRank: number;
  injuryStatus?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [propBets, setPropBets] = useState<PropBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedGames, setSelectedGames] = useState('today');
  const [selectedProps, setSelectedProps] = useState('all');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedOpponent, setSelectedOpponent] = useState<string>('');

  // Calculate hit rate for a stat type
  const calculateHitRate = (stats: GameStat[], line: number, statType: string): number => {
    if (!stats.length) return 0;
    const hits = stats.filter(stat => (stat as any)[statType] >= line).length;
    return Math.round((hits / stats.length) * 100);
  };

  // Calculate streak
  const calculateStreak = (stats: GameStat[], line: number, statType: string): number => {
    if (!stats.length) return 0;
    let streak = 0;
    for (let i = 0; i < stats.length; i++) {
      if ((stats[i] as any)[statType] >= line) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  // Fetch prop betting data using API endpoints
  const fetchPropBets = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch active players from our API
      const playersResponse = await fetch('/api/players?active=true&limit=50');
      if (!playersResponse.ok) throw new Error('Failed to fetch players');
      const playersData = await playersResponse.json();
      const players = playersData.players?.filter((p: any) => p.teamId) || [];

      const propBets: PropBet[] = [];
      const propTypes = ['pts', 'reb', 'ast', 'stl', 'blk', 'fg3m'];
      const currentSeason = 2024;
      const previousSeason = 2023;

      for (const player of players.slice(0, 30)) {
        try {
          // Fetch season averages
          const seasonAvgResponse = await fetch(`/api/season-averages?playerId=${player.id}&season=${currentSeason}`);
          let seasonAverages: SeasonAverages = { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, fg3m: 0, min: 0, games_played: 0 };
          
          if (seasonAvgResponse.ok) {
            const avgData = await seasonAvgResponse.json();
            seasonAverages = avgData.averages || seasonAverages;
          }

          for (const propType of propTypes) {
            // Get base line from season averages
            const baseLine = (seasonAverages as any)[propType] || 0;
            const line = Math.max(0.5, baseLine - 0.5 + Math.random());
            
            // Mock odds (in a real implementation, fetch from /api/odds)
            const overOdds = -110 + Math.floor(Math.random() * 40) - 20;
            const underOdds = -110 + Math.floor(Math.random() * 40) - 20;

            // Mock hit rates (in a real implementation, calculate from player stats)
            const season2425 = 45 + Math.floor(Math.random() * 40);
            const l5Rate = 30 + Math.floor(Math.random() * 50);
            const l10Rate = 35 + Math.floor(Math.random() * 45);
            const l20Rate = 40 + Math.floor(Math.random() * 40);
            const season2324 = 42 + Math.floor(Math.random() * 36);
            
            // Mock H2H rate
            const h2hRate = 40 + Math.floor(Math.random() * 40);

            // Mock streak
            const streak = Math.floor(Math.random() * 10) - 5;
            
            // Calculate projected and difference
            const projected = baseLine;
            const difference = projected - line;
            
            // Mock DVP rank
            const dvpRank = Math.floor(Math.random() * 30) + 1;
            
            // Mock injury status (in a real implementation, fetch from /api/injuries)
            const injuryStatus = Math.random() < 0.1 ? (Math.random() < 0.5 ? 'GTD' : 'Out') : undefined;

            propBets.push({
              id: `${player.id}-${propType}`,
              player: {
                id: player.id,
                first_name: player.firstName,
                last_name: player.lastName,
                position: player.position || '',
                team: player.teamId ? {
                  id: player.teamId,
                  name: player.teamName,
                  abbreviation: player.teamAbbreviation,
                  city: player.teamCity
                } : undefined
              },
              propType,
              line: Number(line.toFixed(1)),
              overOdds,
              underOdds,
              streak,
              season2425,
              h2h: h2hRate,
              l5: l5Rate,
              l10: l10Rate,
              l20: l20Rate,
              season2324,
              projected: Number(projected.toFixed(1)),
              difference: Number(difference.toFixed(1)),
              dvpRank,
              injuryStatus
            });
          }
        } catch (playerError) {
          console.warn(`Failed to fetch data for player ${player.id}:`, playerError);
        }
      }

      setPropBets(propBets);
    } catch (error) {
      console.error('Error fetching prop bets:', error);
      setError('Failed to load prop betting data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // Handle player click
  const handlePlayerClick = (playerId: number) => {
    router.push(`/player/${playerId}`);
  };


  // Format odds for display
  const formatOdds = (odds: number): string => {
    return odds > 0 ? `+${odds}` : odds.toString();
  };

  // Get color for percentage values
  const getPercentageColor = (percentage: number): string => {
    if (percentage >= 60) return 'bg-green-800 text-green-100';
    if (percentage >= 50) return 'bg-green-700 text-green-100';
    if (percentage >= 40) return 'bg-yellow-700 text-yellow-100';
    return 'bg-red-800 text-red-100';
  };

  // Get color for difference values
  const getDifferenceColor = (diff: number): string => {
    return diff >= 0 ? 'text-green-400' : 'text-red-400';
  };

  // Handle column sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Filter and sort prop bets
  const filteredAndSortedPropBets = useMemo(() => {
    let filtered = propBets;

    // Apply filters
    if (selectedSection !== 'all') {
      // Add section filtering logic here
    }
    if (selectedGames !== 'all') {
      // Add games filtering logic here
    }
    if (selectedProps !== 'all') {
      filtered = filtered.filter(bet => bet.propType === selectedProps);
    }

    // Apply sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (sortColumn) {
          case 'player':
            aValue = `${a.player.first_name} ${a.player.last_name}`;
            bValue = `${b.player.first_name} ${b.player.last_name}`;
            break;
          case 'line':
            aValue = a.line;
            bValue = b.line;
            break;
          case 'overOdds':
            aValue = a.overOdds;
            bValue = b.overOdds;
            break;
          case 'underOdds':
            aValue = a.underOdds;
            bValue = b.underOdds;
            break;
          case 'streak':
            aValue = a.streak;
            bValue = b.streak;
            break;
          case 'season2425':
            aValue = a.season2425;
            bValue = b.season2425;
            break;
          case 'h2h':
            aValue = a.h2h;
            bValue = b.h2h;
            break;
          case 'l5':
            aValue = a.l5;
            bValue = b.l5;
            break;
          case 'l10':
            aValue = a.l10;
            bValue = b.l10;
            break;
          case 'l20':
            aValue = a.l20;
            bValue = b.l20;
            break;
          case 'season2324':
            aValue = a.season2324;
            bValue = b.season2324;
            break;
          case 'projected':
            aValue = a.projected;
            bValue = b.projected;
            break;
          case 'difference':
            aValue = a.difference;
            bValue = b.difference;
            break;
          case 'dvpRank':
            aValue = a.dvpRank;
            bValue = b.dvpRank;
            break;
          default:
            return 0;
        }
        
        if (typeof aValue === 'string') {
          return sortDirection === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      });
    }

    return filtered;
  }, [propBets, selectedSection, selectedGames, selectedProps, sortColumn, sortDirection]);

  // Fetch data on component mount only
  useEffect(() => {
    fetchPropBets();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
          <p className="text-neutral-400 mb-4">{error}</p>
          <button 
            onClick={fetchPropBets}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      {/* Top Header */}
      <div className="bg-neutral-800 border-b border-neutral-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-white">NBA Props</h1>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm text-neutral-300">User</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-3 py-1 text-sm text-neutral-300 hover:text-white hover:bg-neutral-700 rounded-md transition-colors"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filter Controls */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Sections Filter */}
            <div className="relative">
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="appearance-none bg-neutral-800 text-white rounded-md px-3 py-1 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Select section"
              >
                <option value="all">All Sections</option>
                <option value="nba">NBA</option>
                <option value="trending">Trending</option>
                <option value="favorites">Favorites</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            </div>

            {/* Games Filter */}
            <div className="relative">
              <select
                value={selectedGames}
                onChange={(e) => setSelectedGames(e.target.value)}
                className="appearance-none bg-neutral-800 text-white rounded-md px-3 py-1 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Select games"
              >
                <option value="all">All Games</option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="week">This Week</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            </div>

            {/* Props Filter */}
            <div className="relative">
              <select
                value={selectedProps}
                onChange={(e) => setSelectedProps(e.target.value)}
                className="appearance-none bg-neutral-800 text-white rounded-md px-3 py-1 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Select prop type"
              >
                <option value="all">All Props</option>
                <option value="pts">Points</option>
                <option value="reb">Rebounds</option>
                <option value="ast">Assists</option>
                <option value="stl">Steals</option>
                <option value="blk">Blocks</option>
                <option value="fg3m">3-Pointers</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Prop Betting Table */}
        <div className="bg-neutral-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Prop betting table">
              <thead className="bg-neutral-700 sticky top-0">
                <tr>
                  <th 
                    scope="col" 
                    className="px-2 py-1 text-left text-xs uppercase tracking-wider text-neutral-300 cursor-pointer hover:bg-neutral-600"
                    onClick={() => handleSort('player')}
                  >
                    <div className="flex items-center gap-1">
                      Player
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-2 py-1 text-center text-xs uppercase tracking-wider text-neutral-300 cursor-pointer hover:bg-neutral-600"
                    onClick={() => handleSort('line')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      L
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-2 py-1 text-center text-xs uppercase tracking-wider text-neutral-300 cursor-pointer hover:bg-neutral-600"
                    onClick={() => handleSort('overOdds')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      O
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-2 py-1 text-center text-xs uppercase tracking-wider text-neutral-300 cursor-pointer hover:bg-neutral-600"
                    onClick={() => handleSort('underOdds')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      U
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-2 py-1 text-center text-xs uppercase tracking-wider text-neutral-300 cursor-pointer hover:bg-neutral-600"
                    onClick={() => handleSort('streak')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      STK
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-2 py-1 text-center text-xs uppercase tracking-wider text-neutral-300 cursor-pointer hover:bg-neutral-600"
                    onClick={() => handleSort('season2425')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      24/25
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-2 py-1 text-center text-xs uppercase tracking-wider text-neutral-300 cursor-pointer hover:bg-neutral-600 hidden sm:table-cell"
                    onClick={() => handleSort('h2h')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      H2H
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-2 py-1 text-center text-xs uppercase tracking-wider text-neutral-300 cursor-pointer hover:bg-neutral-600"
                    onClick={() => handleSort('l5')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      L5
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-2 py-1 text-center text-xs uppercase tracking-wider text-neutral-300 cursor-pointer hover:bg-neutral-600"
                    onClick={() => handleSort('l10')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      L10
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-2 py-1 text-center text-xs uppercase tracking-wider text-neutral-300 cursor-pointer hover:bg-neutral-600 hidden sm:table-cell"
                    onClick={() => handleSort('l20')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      L20
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-2 py-1 text-center text-xs uppercase tracking-wider text-neutral-300 cursor-pointer hover:bg-neutral-600"
                    onClick={() => handleSort('season2324')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      23/24
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-2 py-1 text-center text-xs uppercase tracking-wider text-neutral-300 cursor-pointer hover:bg-neutral-600"
                    onClick={() => handleSort('projected')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      PROJ
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-2 py-1 text-center text-xs uppercase tracking-wider text-neutral-300 cursor-pointer hover:bg-neutral-600"
                    onClick={() => handleSort('difference')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      DIFF
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-2 py-1 text-center text-xs uppercase tracking-wider text-neutral-300 cursor-pointer hover:bg-neutral-600"
                    onClick={() => handleSort('dvpRank')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      DVP
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-700">
                {filteredAndSortedPropBets.map((bet) => (
                  <tr 
                    key={bet.id} 
                    className="hover:bg-neutral-800 transition-colors cursor-pointer"
                    onClick={() => handlePlayerClick(bet.player.id)}
                  >
                    <td className="px-2 py-1 text-sm">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {bet.player.first_name} {bet.player.last_name}
                          {bet.injuryStatus && (
                            <span className={`text-xs px-1 py-0.5 rounded ${
                              bet.injuryStatus === 'GTD' ? 'bg-yellow-800 text-yellow-200' : 'bg-red-800 text-red-200'
                            }`}>
                              {bet.injuryStatus}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-400">
                          {bet.player.team?.abbreviation || 'N/A'} • {bet.propType.toUpperCase()}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-1 text-sm text-center">{bet.line}</td>
                    <td className="px-2 py-1 text-sm text-center">{formatOdds(bet.overOdds)}</td>
                    <td className="px-2 py-1 text-sm text-center">{formatOdds(bet.underOdds)}</td>
                    <td className="px-2 py-1 text-sm text-center">
                      <span className={bet.streak >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {bet.streak >= 0 ? '+' : ''}{bet.streak}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-center">
                      <span className={`text-xs rounded-md px-1 py-0.5 ${getPercentageColor(bet.season2425)}`}>
                        {bet.season2425}%
                      </span>
                    </td>
                    <td className="px-2 py-1 text-center hidden sm:table-cell">
                      <span className={`text-xs rounded-md px-1 py-0.5 ${getPercentageColor(bet.h2h)}`}>
                        {bet.h2h}%
                      </span>
                    </td>
                    <td className="px-2 py-1 text-center">
                      <span className={`text-xs rounded-md px-1 py-0.5 ${getPercentageColor(bet.l5)}`}>
                        {bet.l5}%
                      </span>
                    </td>
                    <td className="px-2 py-1 text-center">
                      <span className={`text-xs rounded-md px-1 py-0.5 ${getPercentageColor(bet.l10)}`}>
                        {bet.l10}%
                      </span>
                    </td>
                    <td className="px-2 py-1 text-center hidden sm:table-cell">
                      <span className={`text-xs rounded-md px-1 py-0.5 ${getPercentageColor(bet.l20)}`}>
                        {bet.l20}%
                      </span>
                    </td>
                    <td className="px-2 py-1 text-center">
                      <span className={`text-xs rounded-md px-1 py-0.5 ${getPercentageColor(bet.season2324)}`}>
                        {bet.season2324}%
                      </span>
                    </td>
                    <td className="px-2 py-1 text-sm text-center">{bet.projected.toFixed(1)}</td>
                    <td className="px-2 py-1 text-sm text-center">
                      <span className={getDifferenceColor(bet.difference)}>
                        {bet.difference >= 0 ? '+' : ''}{bet.difference.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-center">
                      <span className="bg-neutral-800 text-sm rounded-full px-2 py-0.5">
                        {bet.dvpRank}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mt-4 text-center text-sm text-neutral-400">
          Showing {filteredAndSortedPropBets.length} prop bets
        </div>
      </div>
    </div>
  );
}