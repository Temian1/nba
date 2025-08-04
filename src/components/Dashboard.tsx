'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Filter, TrendingUp, BarChart3, Target, Clock, Home, Plane, Star, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import PlayerSearch from './PlayerSearch';
import PropAnalyzer from './PropAnalyzer';
import FilterPanel from './FilterPanel';
import { PropFilter } from '@/lib/services/prop-analytics';
// Removed direct nbaService import to avoid Node.js modules in client component

interface SelectedPlayer {
  id: number;
  firstName: string;
  lastName: string;
  position?: string;
  teamName?: string;
  teamAbbreviation?: string;
}

interface PlayerData {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  team: {
    id: number;
    name: string;
    abbreviation: string;
    city: string;
  };
  recentStats: GameStat[];
  seasonAverages: {
    pts: number;
    reb: number;
    ast: number;
    stl: number;
    blk: number;
    fg3m: number;
    fgm: number;
    ftm: number;
    turnover: number;
    pra: number;
    pr: number;
    pa: number;
    ra: number;
    min: number;
    games_played: number;
  };
  recentAverages?: {
    pts: number;
    reb: number;
    ast: number;
    stl: number;
    blk: number;
    fg3m: number;
    fgm: number;
    ftm: number;
    turnover: number;
    pra: number;
    pr: number;
    pa: number;
    ra: number;
  };
  propValues?: {
    [key: string]: {
      value: number;
      hitRate: number;
      trend: 'up' | 'down';
    };
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
  fgm: number;
  ftm: number;
  turnover: number;
  min: string;
  game: {
    id: number;
    date: string;
  };
}

interface PropLine {
  id: string;
  playerId: number;
  playerName: string;
  team: string;
  position: string;
  propType: string;
  line: number;
  overOdds: number;
  underOdds: number;
  sportsbook: string;
  value: number;
  hitRate: number;
  trend: 'up' | 'down' | 'stable';
  last5Games: number;
  vsOpponent: number;
  recommendation: 'strong_over' | 'over' | 'under' | 'strong_under' | 'avoid';
}

export default function Dashboard() {
  const t = useTranslations();
  const [selectedPlayer, setSelectedPlayer] = useState<SelectedPlayer | null>(null);
  const [filters, setFilters] = useState<PropFilter>({});
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [propLines, setPropLines] = useState<PropLine[]>([]);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPropType, setSelectedPropType] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('value');
  const [viewMode, setViewMode] = useState<'feed' | 'player'>('feed');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handlePlayerSelect = (player: SelectedPlayer) => {
    // Navigate to dedicated player details page
    window.location.href = `/player/${player.id}`;
  };

  const handleDatabaseError = (error: string) => {
    setDbError(error);
  };

  const handleFiltersChange = (newFilters: PropFilter) => {
    setFilters(newFilters);
  };

  const handleBackToFeed = () => {
    setViewMode('feed');
    setSelectedPlayer(null);
  };

  // Fetch teams for filter dropdown
  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams');
      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  // Fetch players with recent stats and season averages
  const fetchPlayersData = async (cursor?: string, search?: string, teamFilter?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams({
        active: 'true',
        limit: '50', // Increased limit for better filtering
        offset: '0'
      });
      
      if (search) {
        params.append('search', search);
      }
      
      // Get active players from API
      const playersResponse = await fetch(`/api/players?${params}`);
      if (!playersResponse.ok) {
        throw new Error('Failed to fetch players');
      }
      
      const playersData = await playersResponse.json();
      let filteredPlayers = playersData.players || [];
      
      // Filter by team if specified
      if (teamFilter) {
        filteredPlayers = filteredPlayers.filter((player: any) => 
          player.teamAbbreviation === teamFilter
        );
      }

      if (filteredPlayers.length === 0) {
        setPlayers([]);
        return;
      }
      
      // Get player IDs for batch season averages request
      const playerIds = filteredPlayers.map((player: any) => player.id);
      
      // Fetch season averages in batch from BallDontLie API
      let seasonAveragesMap = new Map();
      try {
        const seasonResponse = await fetch(`/api/season-averages?player_ids=${playerIds.join(',')}&season=2024`);
        if (seasonResponse.ok) {
          const seasonData = await seasonResponse.json();
          seasonData.data.forEach((avg: any) => {
            seasonAveragesMap.set(avg.player_id, {
              pts: avg.pts || 0,
              reb: avg.reb || 0,
              ast: avg.ast || 0,
              stl: avg.stl || 0,
              blk: avg.blk || 0,
              fg3m: avg.fg3m || 0,
              fgm: avg.fgm || 0,
              ftm: avg.ftm || 0,
              turnover: avg.turnover || 0,
              pra: avg.pra || 0,
              pr: avg.pr || 0,
              pa: avg.pa || 0,
              ra: avg.ra || 0,
              min: avg.min || 0,
              games_played: avg.games_played || 0
            });
          });
        }
      } catch (seasonError) {
        console.error('Error fetching season averages:', seasonError);
      }
      
      // Fetch recent stats for each player
      const playersWithStats = await Promise.all(
        filteredPlayers.map(async (player: any) => {
          try {
            // Get recent stats (last 10 games for better analysis)
            const recentStatsResponse = await fetch(`/api/stats?playerId=${player.id}&limit=10&type=recent`);
            
            let recentStats = [];
            const seasonAverages = seasonAveragesMap.get(player.id) || {
              pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, fg3m: 0, fgm: 0, ftm: 0, 
              turnover: 0, pra: 0, pr: 0, pa: 0, ra: 0, min: 0, games_played: 0
            };
            
            if (recentStatsResponse.ok) {
              const recentData = await recentStatsResponse.json();
              recentStats = (recentData.stats || []).map((stat: any) => ({
                id: stat.id,
                pts: stat.pts || 0,
                reb: stat.reb || 0,
                ast: stat.ast || 0,
                stl: stat.stl || 0,
                blk: stat.blk || 0,
                fg3m: stat.fg3m || 0,
                fgm: stat.fgm || 0,
                ftm: stat.ftm || 0,
                turnover: stat.turnover || 0,
                min: stat.min || '0',
                game: {
                  id: stat.gameId || 0,
                  date: stat.gameDate || ''
                }
              }));
            }
            
            // Calculate recent averages for comparison
            const recentAverages = calculateRecentAverages(recentStats);
            
            return {
              id: player.id,
              first_name: player.firstName,
              last_name: player.lastName,
              position: player.position,
              team: {
                id: player.teamId || 0,
                name: player.teamName || '',
                abbreviation: player.teamAbbreviation || '',
                city: player.teamCity || ''
              },
              recentStats,
              seasonAverages,
              recentAverages,
              // Calculate prop values for sorting
              propValues: calculatePropValues(seasonAverages, recentAverages)
            };
          } catch (error) {
            console.error(`Error fetching stats for player ${player.id}:`, error);
            const defaultAverages = {
              pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, fg3m: 0, fgm: 0, ftm: 0,
              turnover: 0, pra: 0, pr: 0, pa: 0, ra: 0, min: 0, games_played: 0
            };
            return {
              id: player.id,
              first_name: player.firstName,
              last_name: player.lastName,
              position: player.position,
              team: {
                id: player.teamId || 0,
                name: player.teamName || '',
                abbreviation: player.teamAbbreviation || '',
                city: player.teamCity || ''
              },
              recentStats: [],
              seasonAverages: defaultAverages,
              recentAverages: defaultAverages,
              propValues: calculatePropValues(defaultAverages, defaultAverages)
            };
          }
        })
      );
      
      setPlayers(playersWithStats);
      
    } catch (error) {
      console.error('Error fetching players data:', error);
      setError('Failed to load players data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate recent averages from recent stats
  const calculateRecentAverages = (recentStats: any[]) => {
    if (recentStats.length === 0) {
      return { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, fg3m: 0, fgm: 0, ftm: 0, turnover: 0, pra: 0, pr: 0, pa: 0, ra: 0 };
    }
    
    const totals = recentStats.reduce((acc, stat) => {
      acc.pts += stat.pts;
      acc.reb += stat.reb;
      acc.ast += stat.ast;
      acc.stl += stat.stl || 0;
      acc.blk += stat.blk || 0;
      acc.fg3m += stat.fg3m || 0;
      acc.fgm += stat.fgm || 0;
      acc.ftm += stat.ftm || 0;
      acc.turnover += stat.turnover || 0;
      return acc;
    }, { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, fg3m: 0, fgm: 0, ftm: 0, turnover: 0 });
    
    const games = recentStats.length;
    return {
      pts: Math.round((totals.pts / games) * 10) / 10,
      reb: Math.round((totals.reb / games) * 10) / 10,
      ast: Math.round((totals.ast / games) * 10) / 10,
      stl: Math.round((totals.stl / games) * 10) / 10,
      blk: Math.round((totals.blk / games) * 10) / 10,
      fg3m: Math.round((totals.fg3m / games) * 10) / 10,
      fgm: Math.round((totals.fgm / games) * 10) / 10,
      ftm: Math.round((totals.ftm / games) * 10) / 10,
      turnover: Math.round((totals.turnover / games) * 10) / 10,
      pra: Math.round(((totals.pts + totals.reb + totals.ast) / games) * 10) / 10,
      pr: Math.round(((totals.pts + totals.reb) / games) * 10) / 10,
      pa: Math.round(((totals.pts + totals.ast) / games) * 10) / 10,
      ra: Math.round(((totals.reb + totals.ast) / games) * 10) / 10
    };
  };

  // Calculate prop values for sorting and filtering
  const calculatePropValues = (seasonAverages: any, recentAverages: any) => {
    return {
      pts: {
        value: Math.abs(recentAverages.pts - seasonAverages.pts),
        hitRate: recentAverages.pts > seasonAverages.pts ? 70 : 30,
        trend: recentAverages.pts > seasonAverages.pts ? 'up' : 'down'
      },
      reb: {
        value: Math.abs(recentAverages.reb - seasonAverages.reb),
        hitRate: recentAverages.reb > seasonAverages.reb ? 70 : 30,
        trend: recentAverages.reb > seasonAverages.reb ? 'up' : 'down'
      },
      ast: {
        value: Math.abs(recentAverages.ast - seasonAverages.ast),
        hitRate: recentAverages.ast > seasonAverages.ast ? 70 : 30,
        trend: recentAverages.ast > seasonAverages.ast ? 'up' : 'down'
      },
      stl: {
        value: Math.abs(recentAverages.stl - seasonAverages.stl),
        hitRate: recentAverages.stl > seasonAverages.stl ? 70 : 30,
        trend: recentAverages.stl > seasonAverages.stl ? 'up' : 'down'
      },
      blk: {
        value: Math.abs(recentAverages.blk - seasonAverages.blk),
        hitRate: recentAverages.blk > seasonAverages.blk ? 70 : 30,
        trend: recentAverages.blk > seasonAverages.blk ? 'up' : 'down'
      },
      fg3m: {
        value: Math.abs(recentAverages.fg3m - seasonAverages.fg3m),
        hitRate: recentAverages.fg3m > seasonAverages.fg3m ? 70 : 30,
        trend: recentAverages.fg3m > seasonAverages.fg3m ? 'up' : 'down'
      },
      pra: {
        value: Math.abs(recentAverages.pra - seasonAverages.pra),
        hitRate: recentAverages.pra > seasonAverages.pra ? 70 : 30,
        trend: recentAverages.pra > seasonAverages.pra ? 'up' : 'down'
      },
      pr: {
        value: Math.abs(recentAverages.pr - seasonAverages.pr),
        hitRate: recentAverages.pr > seasonAverages.pr ? 70 : 30,
        trend: recentAverages.pr > seasonAverages.pr ? 'up' : 'down'
      },
      pa: {
        value: Math.abs(recentAverages.pa - seasonAverages.pa),
        hitRate: recentAverages.pa > seasonAverages.pa ? 70 : 30,
        trend: recentAverages.pa > seasonAverages.pa ? 'up' : 'down'
      },
      ra: {
        value: Math.abs(recentAverages.ra - seasonAverages.ra),
        hitRate: recentAverages.ra > seasonAverages.ra ? 70 : 30,
        trend: recentAverages.ra > seasonAverages.ra ? 'up' : 'down'
      }
    };
  };

  // Get stat comparison color
  const getStatColor = (gameStat: number, seasonAvg: number) => {
    if (gameStat > seasonAvg) return 'text-green-600 bg-green-50';
    if (gameStat < seasonAvg) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
    fetchPlayersData(undefined, term, selectedTeam);
  };

  // Handle team filter
  const handleTeamFilter = (team: string) => {
    setSelectedTeam(team);
    setCurrentPage(1);
    fetchPlayersData(undefined, searchTerm, team);
  };

  // Load next page
  const loadNextPage = () => {
    if (nextCursor) {
      setCurrentPage(prev => prev + 1);
      fetchPlayersData(nextCursor, searchTerm, selectedTeam);
    }
  };

  // Load previous page
  const loadPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      fetchPlayersData(undefined, searchTerm, selectedTeam);
    }
  };

  // Initialize data loading
  useEffect(() => {
    fetchTeams();
    fetchPlayersData();
    
    // Note: Prop lines would be fetched from a real sportsbook API in production
    // For now, the prop analysis functionality works with real player data
    setPropLines([]);
  }, []);

  // Handle search and filter changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm || selectedTeam) {
        fetchPlayersData(undefined, searchTerm, selectedTeam);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, selectedTeam]);

  const propTypes = [
    { value: 'pts', label: 'Puntos' },
    { value: 'reb', label: 'Rebotes' },
    { value: 'ast', label: 'Asistencias' },
    { value: 'stl', label: 'Robos' },
    { value: 'blk', label: 'Bloqueos' },
    { value: 'fg3m', label: '3PM' },
    { value: 'pra', label: 'PRA' },
    { value: 'pr', label: 'P+R' },
    { value: 'pa', label: 'P+A' },
    { value: 'ra', label: 'R+A' }
  ];

  // Filter and sort players based on current criteria
  const filteredAndSortedPlayers = useMemo(() => {
    let filtered = players;
    
    // Filter by selected prop types - only show players with non-zero values for selected stats
    if (selectedPropType.length > 0) {
      filtered = filtered.filter(player => {
        return selectedPropType.some(propType => {
          const seasonValue = player.seasonAverages[propType as keyof typeof player.seasonAverages] || 0;
          const recentValue = player.recentAverages?.[propType as keyof typeof player.recentAverages] || 0;
          return seasonValue > 0 || recentValue > 0;
        });
      });
    }
    
    // Sort based on sortBy criteria
    if (sortBy === 'value') {
      // Sort by difference between recent and season averages for the first selected prop type
      const primaryProp = selectedPropType[0] || 'pts';
      filtered = [...filtered].sort((a, b) => {
        const aValue = a.propValues?.[primaryProp]?.value || 0;
        const bValue = b.propValues?.[primaryProp]?.value || 0;
        return bValue - aValue;
      });
    } else if (sortBy === 'hitRate') {
      // Sort by hit rate for the first selected prop type
      const primaryProp = selectedPropType[0] || 'pts';
      filtered = [...filtered].sort((a, b) => {
        const aHitRate = a.propValues?.[primaryProp]?.hitRate || 0;
        const bHitRate = b.propValues?.[primaryProp]?.hitRate || 0;
        return bHitRate - aHitRate;
      });
    } else if (sortBy === 'line') {
      // Sort by season average for the first selected prop type (as proxy for line)
      const primaryProp = selectedPropType[0] || 'pts';
      filtered = [...filtered].sort((a, b) => {
        const aLine = a.seasonAverages[primaryProp as keyof typeof a.seasonAverages] || 0;
        const bLine = b.seasonAverages[primaryProp as keyof typeof b.seasonAverages] || 0;
        return bLine - aLine;
      });
    }
    
    return filtered;
  }, [players, sortBy, selectedPropType]);
  
  const filteredProps = propLines.filter(prop => {
    if (selectedPropType.length === 0) return true;
    return selectedPropType.some(propType => 
      prop.propType.toLowerCase().includes(propType.toLowerCase())
    );
  }).sort((a, b) => {
    switch (sortBy) {
      case 'value': return b.value - a.value;
      case 'hitRate': return b.hitRate - a.hitRate;
      case 'line': return b.line - a.line;
      default: return 0;
    }
  });

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'strong_over': return 'bg-green-600 text-white';
      case 'over': return 'bg-green-400 text-white';
      case 'under': return 'bg-red-400 text-white';
      case 'strong_under': return 'bg-red-600 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />;
      default: return <BarChart3 className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mensaje de Error de Base de Datos */}
      {dbError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 mx-4">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            🚨 Error de Base de Datos
          </h3>
          <p className="text-sm text-red-700">Por favor, verifique su conexión a la base de datos y vuelva a intentarlo.</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-lg border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              {viewMode === 'player' && (
                <button
                  onClick={handleBackToFeed}
                  className="flex items-center text-blue-600 hover:text-blue-800 transition-colors font-medium"
                >
                  ← Volver al Feed
                </button>
              )}
              <div className="flex items-center space-x-3">
                
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {viewMode === 'feed' ? '' : `${selectedPlayer?.firstName} ${selectedPlayer?.lastName}`}
                </h1>
                {viewMode === 'feed' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></span>
                    Live
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors border border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-600"
              >
                <Filter className="w-4 h-4 mr-1" />
                Filters
              </button>
              {viewMode === 'feed' && (
                <div className="hidden sm:block">
                  <PlayerSearch onPlayerSelect={handlePlayerSelect} onError={handleDatabaseError} />
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Stats Bar */}
        {viewMode === 'feed' && (
          <div className="bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    <span className="text-gray-600 dark:text-gray-300">
                      <span className="font-semibold text-gray-900 dark:text-white">{players.length}</span> Players Available
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-green-600" />
                    <span className="text-gray-600 dark:text-gray-300">
                      <span className="font-semibold text-green-600">{players.filter(p => p.recentStats.length > 0).length}</span> With Recent Stats
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="text-gray-600 dark:text-gray-300">
                      Updated <span className="font-semibold">2 min ago</span>
                    </span>
                  </div>
                </div>
                <div className="hidden sm:flex items-center space-x-4 text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Sportsbooks:</span>
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">DK</span>
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">FD</span>
                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">MGM</span>
                  <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded">CZR</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Mobile Player Search */}
        {viewMode === 'feed' && (
          <div className="sm:hidden mb-4">
            <PlayerSearch onPlayerSelect={handlePlayerSelect} onError={handleDatabaseError} />
          </div>
        )}

        {/* Filter Panel */}
        {isFilterPanelOpen && (
          <div className="mb-6">
            <FilterPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClose={() => setIsFilterPanelOpen(false)}
            />
          </div>
        )}

        {viewMode === 'feed' ? (
          <>
            {/* Controls Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
              {/* Quick Prop Type Filters */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedPropType([])}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      selectedPropType.length === 0
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    All Props
                  </button>
                  {propTypes.map(type => (
                    <button
                      key={type.value}
                      onClick={() => {
                        setSelectedPropType(prev => 
                          prev.includes(type.value)
                            ? prev.filter(p => p !== type.value)
                            : [...prev, type.value]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        selectedPropType.includes(type.value)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Sort and View Options */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sort by:
                  </span>
                  <div className="flex space-x-1">
                    {[
                      { value: 'value', label: 'Value', icon: '🎯' },
                      { value: 'hitRate', label: 'Hit Rate', icon: '📊' },
                      { value: 'line', label: 'Line', icon: '📈' }
                    ].map(option => (
                      <button
                        key={option.value}
                        onClick={() => setSortBy(option.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1 ${
                          sortBy === option.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <span>{option.icon}</span>
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
                  <span>Showing {filteredAndSortedPlayers.length} of {players.length} players</span>
                  {selectedPropType.length > 0 && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                      Filtered by: {selectedPropType.map(p => propTypes.find(pt => pt.value === p)?.label).join(', ')}
                    </span>
                  )}
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs">Live data</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search players..."
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                <div className="w-full md:w-48">
                  <select
                    value={selectedTeam}
                    onChange={(e) => handleTeamFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">All Teams</option>
                    {Array.isArray(teams) && teams.map((team) => (
                      <option key={team.id} value={team.abbreviation}>
                        {team.abbreviation} - {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <div className="text-red-800 dark:text-red-200">{error}</div>
              </div>
            )}

            {/* NBA Players Feed */}
            {loading ? (
               <div className="flex flex-col items-center justify-center py-12">
                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                 <span className="text-gray-600 dark:text-gray-400 text-lg font-medium">Loading NBA players...</span>
                 <span className="text-gray-500 dark:text-gray-500 text-sm mt-2">Fetching season averages and recent stats</span>
               </div>
            ) : (
              <div className="space-y-4">
                {filteredAndSortedPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                    onClick={() => handlePlayerSelect({
                      id: player.id,
                      firstName: player.first_name,
                      lastName: player.last_name,
                      position: player.position,
                      teamAbbreviation: player.team.abbreviation
                    })}
                  >
                    <div className="p-4">
                      {/* Player Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg flex items-center justify-center">
                            <span className="text-sm font-bold">
                              {player.first_name[0]}{player.last_name[0]}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                              {player.first_name} {player.last_name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {player.position} • {player.team.abbreviation}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Season Averages</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {player.seasonAverages.pts || 0} PTS • {player.seasonAverages.reb || 0} REB • {player.seasonAverages.ast || 0} AST
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Stats Grid based on selected prop types */}
                      <div className="space-y-4">
                        {selectedPropType.length > 0 ? (
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {selectedPropType.slice(0, 8).map(propType => {
                              const propLabel = propTypes.find(p => p.value === propType)?.label || propType;
                              const seasonValue = player.seasonAverages[propType as keyof typeof player.seasonAverages] || 0;
                              const recentValue = player.recentAverages?.[propType as keyof typeof player.recentAverages] || 0;
                              const isUp = recentValue > seasonValue;
                              const difference = Math.abs(recentValue - seasonValue);
                              
                              return (
                                <div key={propType} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                                  <div className="text-center">
                                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{propLabel}</h4>
                                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                                      {recentValue > 0 ? recentValue : 'N/A'}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      Season: {seasonValue > 0 ? seasonValue : 'N/A'}
                                    </div>
                                    {recentValue > 0 && seasonValue > 0 && (
                                      <div className={`text-xs font-medium mt-1 ${
                                        isUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                      }`}>
                                        {isUp ? '↗' : '↘'} {difference.toFixed(1)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* Points */}
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Points</h4>
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                  Avg: {player.seasonAverages.pts || 0}
                                </span>
                              </div>
                              <div className="space-y-1">
                                {player.recentStats.slice(0, 5).map((stat, statIndex) => (
                                  <div key={stat.id || statIndex} className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      Game {statIndex + 1}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      getStatColor(stat.pts, player.seasonAverages.pts)
                                    }`}>
                                      {stat.pts}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Rebounds */}
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Rebounds</h4>
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                  Avg: {player.seasonAverages.reb || 0}
                                </span>
                              </div>
                              <div className="space-y-1">
                                {player.recentStats.slice(0, 5).map((stat, statIndex) => (
                                  <div key={stat.id || statIndex} className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      Game {statIndex + 1}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      getStatColor(stat.reb, player.seasonAverages.reb)
                                    }`}>
                                      {stat.reb}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Assists */}
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Assists</h4>
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                  Avg: {player.seasonAverages.ast || 0}
                                </span>
                              </div>
                              <div className="space-y-1">
                                {player.recentStats.slice(0, 5).map((stat, statIndex) => (
                                  <div key={stat.id || statIndex} className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      Game {statIndex + 1}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      getStatColor(stat.ast, player.seasonAverages.ast)
                                    }`}>
                                      {stat.ast}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                <div className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {filteredAndSortedPlayers.length} of {players.length} players • Page {currentPage}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={loadPreviousPage}
                      disabled={currentPage === 1}
                      className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </button>
                    <button
                      onClick={loadNextPage}
                      disabled={!nextCursor}
                      className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Player Detail View */
          selectedPlayer && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Analyzing {selectedPlayer.firstName} {selectedPlayer.lastName}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedPlayer.position} • {selectedPlayer.teamAbbreviation}
                    </span>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    💡 <strong>Instructions:</strong> Select a prop type (Points, Rebounds, Assists) and a betting line to see how many times {selectedPlayer.firstName} {selectedPlayer.lastName} exceeded that line in recent games.
                  </p>
                </div>
              </div>
              
              <PropAnalyzer
                playerId={selectedPlayer.id}
                playerName={`${selectedPlayer.firstName} ${selectedPlayer.lastName}`}
                filters={filters}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
}