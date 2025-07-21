'use client';

import { useState, useEffect, useMemo } from 'react';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface PlayerStat {
  id: number;
  player_id: number;
  game_id: number;
  team_id: number;
  min: string;
  fgm: number;
  fga: number;
  fg3m: number;
  fg3a: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  turnover: number;
  pf: number;
  pts: number;
  fg_pct: number;
  fg3_pct: number;
  ft_pct: number;
  player: {
    id: number;
    first_name: string;
    last_name: string;
    position: string;
  };
  team: {
    id: number;
    abbreviation: string;
    city: string;
    full_name: string;
    name: string;
  };
  game: {
    id: number;
    date: string;
    season: number;
    home_team_score: number;
    visitor_team_score: number;
  };
}

type StatFilter = 'all' | 'pts' | 'reb' | 'ast' | 'stl' | 'blk' | 'fg3m' | 'pra';

export default function AdminStats() {
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [statFilter, setStatFilter] = useState<StatFilter>('all');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [sortBy, setSortBy] = useState('pts');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [teams, setTeams] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [seasons, setSeasons] = useState<number[]>([]);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/stats?limit=1000', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data || []);
        
        // Extract unique values for filters
        const uniqueTeams = [...new Set(data.data.map((s: PlayerStat) => s.team?.full_name).filter(Boolean))];
        const uniquePositions = [...new Set(data.data.map((s: PlayerStat) => s.player?.position).filter(Boolean))];
        const uniqueSeasons = [...new Set(data.data.map((s: PlayerStat) => s.game?.season).filter(Boolean))];
        
        setTeams(uniqueTeams.sort());
        setPositions(uniquePositions.sort());
        setSeasons(uniqueSeasons.sort((a, b) => b - a));
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatValue = (stat: PlayerStat, filter: StatFilter): number => {
    switch (filter) {
      case 'pts': return stat.pts;
      case 'reb': return stat.reb;
      case 'ast': return stat.ast;
      case 'stl': return stat.stl;
      case 'blk': return stat.blk;
      case 'fg3m': return stat.fg3m;
      case 'pra': return stat.pts + stat.reb + stat.ast;
      default: return stat.pts;
    }
  };

  const filteredAndSortedStats = useMemo(() => {
    let filtered = stats.filter(stat => {
      const playerName = `${stat.player?.first_name || ''} ${stat.player?.last_name || ''}`.toLowerCase();
      const matchesSearch = debouncedSearchTerm === '' || 
        playerName.includes(debouncedSearchTerm.toLowerCase()) ||
        stat.team?.full_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        stat.team?.abbreviation?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const matchesTeam = selectedTeam === '' || stat.team?.full_name === selectedTeam;
      const matchesPosition = selectedPosition === '' || stat.player?.position === selectedPosition;
      const matchesSeason = selectedSeason === '' || stat.game?.season?.toString() === selectedSeason;
      
      // Stat value filtering
      let matchesStatFilter = true;
      if (statFilter !== 'all' && (minValue !== '' || maxValue !== '')) {
        const statValue = getStatValue(stat, statFilter);
        if (minValue !== '' && statValue < parseFloat(minValue)) matchesStatFilter = false;
        if (maxValue !== '' && statValue > parseFloat(maxValue)) matchesStatFilter = false;
      }
      
      return matchesSearch && matchesTeam && matchesPosition && matchesSeason && matchesStatFilter;
    });

    // Sort stats
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'player':
          aValue = `${a.player?.first_name || ''} ${a.player?.last_name || ''}`;
          bValue = `${b.player?.first_name || ''} ${b.player?.last_name || ''}`;
          break;
        case 'team':
          aValue = a.team?.full_name || '';
          bValue = b.team?.full_name || '';
          break;
        case 'date':
          aValue = new Date(a.game?.date || '');
          bValue = new Date(b.game?.date || '');
          break;
        case 'pra':
          aValue = a.pts + a.reb + a.ast;
          bValue = b.pts + b.reb + b.ast;
          break;
        default:
          aValue = (a as any)[sortBy] || 0;
          bValue = (b as any)[sortBy] || 0;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [stats, debouncedSearchTerm, selectedTeam, selectedPosition, selectedSeason, statFilter, minValue, maxValue, sortBy, sortOrder]);

  const paginatedStats = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedStats.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedStats, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedStats.length / itemsPerPage);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTeam('');
    setSelectedPosition('');
    setSelectedSeason('');
    setStatFilter('all');
    setMinValue('');
    setMaxValue('');
    setSortBy('pts');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          📊 Player Statistics
        </h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {filteredAndSortedStats.length} of {stats.length} stat lines
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Players/Teams
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Search by player or team..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Team
            </label>
            <select
              value={selectedTeam}
              onChange={(e) => {
                setSelectedTeam(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Teams</option>
              {teams.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Position
            </label>
            <select
              value={selectedPosition}
              onChange={(e) => {
                setSelectedPosition(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Positions</option>
              {positions.map(position => (
                <option key={position} value={position}>{position}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Season
            </label>
            <select
              value={selectedSeason}
              onChange={(e) => {
                setSelectedSeason(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Seasons</option>
              {seasons.map(season => (
                <option key={season} value={season}>{season}-{season + 1}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stat Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Stat Filter
            </label>
            <select
              value={statFilter}
              onChange={(e) => {
                setStatFilter(e.target.value as StatFilter);
                setMinValue('');
                setMaxValue('');
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Stats</option>
              <option value="pts">Points (PTS)</option>
              <option value="reb">Rebounds (REB)</option>
              <option value="ast">Assists (AST)</option>
              <option value="stl">Steals (STL)</option>
              <option value="blk">Blocks (BLK)</option>
              <option value="fg3m">3-Pointers Made (3PM)</option>
              <option value="pra">Points + Rebounds + Assists (PRA)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Min Value
            </label>
            <input
              type="number"
              value={minValue}
              onChange={(e) => {
                setMinValue(e.target.value);
                setCurrentPage(1);
              }}
              disabled={statFilter === 'all'}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              placeholder="Min"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Value
            </label>
            <input
              type="number"
              value={maxValue}
              onChange={(e) => {
                setMaxValue(e.target.value);
                setCurrentPage(1);
              }}
              disabled={statFilter === 'all'}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              placeholder="Max"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Stats Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('player')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Player</span>
                    {sortBy === 'player' && (
                      <span className="text-blue-500">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('team')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Team</span>
                    {sortBy === 'team' && (
                      <span className="text-blue-500">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Date</span>
                    {sortBy === 'date' && (
                      <span className="text-blue-500">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('pts')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>PTS</span>
                    {sortBy === 'pts' && (
                      <span className="text-blue-500">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('reb')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>REB</span>
                    {sortBy === 'reb' && (
                      <span className="text-blue-500">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('ast')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>AST</span>
                    {sortBy === 'ast' && (
                      <span className="text-blue-500">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('fg3m')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>3PM</span>
                    {sortBy === 'fg3m' && (
                      <span className="text-blue-500">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('pra')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>PRA</span>
                    {sortBy === 'pra' && (
                      <span className="text-blue-500">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Other
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedStats.map((stat) => (
                <tr key={stat.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-300">
                            {stat.player?.first_name?.[0]}{stat.player?.last_name?.[0]}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {stat.player?.first_name} {stat.player?.last_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {stat.player?.position}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {stat.team?.abbreviation}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {stat.team?.city}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {stat.game?.date ? formatDate(stat.game.date) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900 dark:text-white">
                    {stat.pts}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 dark:text-white">
                    {stat.reb}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 dark:text-white">
                    {stat.ast}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 dark:text-white">
                    {stat.fg3m}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-blue-600 dark:text-blue-400">
                    {stat.pts + stat.reb + stat.ast}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                    <div className="space-y-1">
                      <div>STL: {stat.stl}</div>
                      <div>BLK: {stat.blk}</div>
                      <div>TO: {stat.turnover}</div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, filteredAndSortedStats.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredAndSortedStats.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + Math.max(1, currentPage - 2);
                    if (page > totalPages) return null;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === currentPage
                            ? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-600 dark:text-blue-200'
                            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {filteredAndSortedStats.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            <span className="text-4xl mb-4 block">🔍</span>
            <p className="text-lg font-medium">No stats found</p>
            <p className="text-sm">Try adjusting your search criteria</p>
          </div>
        </div>
      )}
    </div>
  );
}