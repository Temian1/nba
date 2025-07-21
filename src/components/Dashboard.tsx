'use client';

import { useState, useEffect } from 'react';
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
  position?: string;
  team?: {
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
    min: number;
  };
}

interface GameStat {
  id: number;
  pts: number;
  reb: number;
  ast: number;
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
  const [selectedPropType, setSelectedPropType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('value');
  const [viewMode, setViewMode] = useState<'feed' | 'player'>('feed');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handlePlayerSelect = (player: SelectedPlayer) => {
    setSelectedPlayer(player);
    setViewMode('player');
    setDbError(null);
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
        limit: '20',
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
      
      // Fetch stats for each player
      const playersWithStats = await Promise.all(
        filteredPlayers.map(async (player: any) => {
          try {
            // Get recent stats (last 5 games)
            const recentStatsResponse = await fetch(`/api/stats?playerId=${player.id}&limit=5&type=recent`);
            const seasonStatsResponse = await fetch(`/api/stats?playerId=${player.id}&type=season`);
            
            let recentStats = [];
            let seasonAverages = { pts: 0, reb: 0, ast: 0, min: 0 };
            
            if (recentStatsResponse.ok) {
              const recentData = await recentStatsResponse.json();
              recentStats = (recentData.stats || []).map((stat: any) => ({
                id: stat.id,
                pts: stat.pts || 0,
                reb: stat.reb || 0,
                ast: stat.ast || 0,
                min: stat.min || '0',
                game: {
                  id: stat.gameId || 0,
                  date: stat.gameDate || ''
                }
              }));
            }
            
            if (seasonStatsResponse.ok) {
              const seasonData = await seasonStatsResponse.json();
              if (seasonData.averages) {
                seasonAverages = {
                  pts: Math.round((seasonData.averages.pts || 0) * 10) / 10,
                  reb: Math.round((seasonData.averages.reb || 0) * 10) / 10,
                  ast: Math.round((seasonData.averages.ast || 0) * 10) / 10,
                  min: Math.round((seasonData.averages.min || 0) * 10) / 10
                };
              }
            }
            
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
              seasonAverages
            };
          } catch (error) {
            console.error(`Error fetching stats for player ${player.id}:`, error);
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
              seasonAverages: { pts: 0, reb: 0, ast: 0, min: 0 }
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

  // Removed calculateSeasonAverages function - now using API for season averages

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
    
    // Mock data for demonstration - replace with real API calls
    const mockPropLines: PropLine[] = [
      {
        id: '1',
        playerId: 1,
        playerName: 'Jayson Tatum',
        team: 'BOS',
        position: 'SF',
        propType: 'Points',
        line: 26.5,
        overOdds: -110,
        underOdds: -110,
        sportsbook: 'DraftKings',
        value: 9.2,
        hitRate: 78,
        trend: 'up',
        last5Games: 80,
        vsOpponent: 85,
        recommendation: 'strong_over'
      },
      {
        id: '2',
        playerId: 2,
        playerName: 'Luka Dončić',
        team: 'DAL',
        position: 'PG',
        propType: 'Assists',
        line: 8.5,
        overOdds: -105,
        underOdds: -115,
        sportsbook: 'FanDuel',
        value: 8.7,
        hitRate: 72,
        trend: 'up',
        last5Games: 80,
        vsOpponent: 90,
        recommendation: 'strong_over'
      },
      {
        id: '3',
        playerId: 3,
        playerName: 'Nikola Jokić',
        team: 'DEN',
        position: 'C',
        propType: 'Rebounds',
        line: 12.5,
        overOdds: -120,
        underOdds: +100,
        sportsbook: 'BetMGM',
        value: 8.1,
        hitRate: 75,
        trend: 'up',
        last5Games: 60,
        vsOpponent: 95,
        recommendation: 'over'
      },
      {
        id: '4',
        playerId: 4,
        playerName: 'Giannis Antetokounmpo',
        team: 'MIL',
        position: 'PF',
        propType: 'Points',
        line: 29.5,
        overOdds: -115,
        underOdds: -105,
        sportsbook: 'Caesars',
        value: 7.8,
        hitRate: 68,
        trend: 'stable',
        last5Games: 60,
        vsOpponent: 75,
        recommendation: 'over'
      },
      {
        id: '5',
        playerId: 5,
        playerName: 'Stephen Curry',
        team: 'GSW',
        position: 'PG',
        propType: '3PM',
        line: 4.5,
        overOdds: -110,
        underOdds: -110,
        sportsbook: 'DraftKings',
        value: 7.5,
        hitRate: 65,
        trend: 'down',
        last5Games: 40,
        vsOpponent: 80,
        recommendation: 'under'
      },
      {
        id: '6',
        playerId: 6,
        playerName: 'Joel Embiid',
        team: 'PHI',
        position: 'C',
        propType: 'Points + Rebounds',
        line: 42.5,
        overOdds: -108,
        underOdds: -112,
        sportsbook: 'BetMGM',
        value: 7.2,
        hitRate: 70,
        trend: 'up',
        last5Games: 80,
        vsOpponent: 65,
        recommendation: 'over'
      },
      {
        id: '7',
        playerId: 7,
        playerName: 'Damian Lillard',
        team: 'MIL',
        position: 'PG',
        propType: 'Points + Assists',
        line: 35.5,
        overOdds: -105,
        underOdds: -115,
        sportsbook: 'FanDuel',
        value: 6.9,
        hitRate: 73,
        trend: 'stable',
        last5Games: 60,
        vsOpponent: 85,
        recommendation: 'over'
      },
      {
        id: '8',
        playerId: 8,
        playerName: 'Anthony Davis',
        team: 'LAL',
        position: 'PF',
        propType: 'Blocks',
        line: 1.5,
        overOdds: -120,
        underOdds: +100,
        sportsbook: 'Caesars',
        value: 6.5,
        hitRate: 58,
        trend: 'down',
        last5Games: 40,
        vsOpponent: 70,
        recommendation: 'under'
      },
      {
        id: '9',
        playerId: 9,
        playerName: 'Draymond Green',
        team: 'GSW',
        position: 'PF',
        propType: 'Steals',
        line: 1.5,
        overOdds: -110,
        underOdds: -110,
        sportsbook: 'DraftKings',
        value: 6.2,
        hitRate: 62,
        trend: 'stable',
        last5Games: 60,
        vsOpponent: 55,
        recommendation: 'avoid'
      },
      {
        id: '10',
        playerId: 10,
        playerName: 'Russell Westbrook',
        team: 'LAC',
        position: 'PG',
        propType: 'PRA',
        line: 28.5,
        overOdds: -108,
        underOdds: -112,
        sportsbook: 'BetMGM',
        value: 5.8,
        hitRate: 55,
        trend: 'down',
        last5Games: 20,
        vsOpponent: 45,
        recommendation: 'strong_under'
      }
    ];
    setPropLines(mockPropLines);
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

  const propTypes = ['all', 'Points', 'Rebounds', 'Assists', 'Points + Rebounds', 'Points + Assists', 'PRA', '3PM', 'Blocks', 'Steals'];
  
  const filteredProps = propLines.filter(prop => 
    selectedPropType === 'all' || prop.propType === selectedPropType
  ).sort((a, b) => {
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
      {/* Database Error Message */}
      {dbError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 mx-4">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            🚨 Database Error
          </h3>
          <p className="text-sm text-red-700">Please check your database connection and try again.</p>
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
                  ← Back to Feed
                </button>
              )}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">P</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {viewMode === 'feed' ? 'Props.Cash' : `${selectedPlayer?.firstName} ${selectedPlayer?.lastName}`}
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
                  {propTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => setSelectedPropType(type)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        selectedPropType === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {type === 'all' ? 'All Props' : type}
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
                  <span>Showing {players.length} players</span>
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
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-300">Loading players...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {players.map((player, index) => (
                  <div
                    key={player.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                    onClick={() => handlePlayerSelect({
                      id: player.id.toString(),
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
                            {player.seasonAverages.pts} PTS • {player.seasonAverages.reb} REB • {player.seasonAverages.ast} AST
                          </div>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Points */}
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Points</h4>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                              Avg: {player.seasonAverages.pts}
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
                              Avg: {player.seasonAverages.reb}
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
                              Avg: {player.seasonAverages.ast}
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
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                <div className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {players.length} players • Page {currentPage}
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
            <PropAnalyzer
              playerId={selectedPlayer.id}
              playerName={`${selectedPlayer.firstName} ${selectedPlayer.lastName}`}
              filters={filters}
            />
          )
        )}
      </div>
    </div>
  );
}