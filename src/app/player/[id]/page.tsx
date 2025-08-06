'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Activity, BarChart3, Target, Calendar, Home, Plane, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PropChart from '@/components/PropChart';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Player {
  id: number;
  firstName: string;
  lastName: string;
  position: string;
  height: string;
  weight: string;
  jerseyNumber: string;
  college: string;
  country: string;
  draftYear: number | null;
  draftRound: number | null;
  draftNumber: number | null;
  teamId: number;
  teamName: string;
  teamAbbreviation: string;
  teamCity: string;
  teamConference: string;
  teamDivision: string;
}

interface SeasonAverages {
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  fg3m: number;
  fgm: number;
  ftm: number;
  turnover: number;
  min: number;
  games_played: number;
  fg_pct: number;
  fg3_pct: number;
  ft_pct: number;
  pra: number;
  pr: number;
  pa: number;
  ra: number;
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
  pra: number;
  pr: number;
  pa: number;
  ra: number;
  game: {
    id: number;
    date: string;
    homeTeam: string;
    awayTeam: string;
    isHome: boolean;
    opponent: string;
  };
}

interface Injury {
  id: number;
  player: string;
  status: string;
  description: string;
  date: string;
}

interface Odds {
  book: string;
  line: number;
  underPrice: string;
  overPrice: string;
}

interface AltLine {
  line: number;
  odds: string;
  hitRate: number;
}

interface FilterState {
  home: boolean;
  away: boolean;
  regSeason: boolean;
  playoffs: boolean;
  win: boolean;
  loss: boolean;
  twoDaysRest: boolean;
}

interface HitRateData {
  hits: number;
  total: number;
  hitRate: number;
}

export default function PlayerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const playerId = params.id as string;

  const [player, setPlayer] = useState<Player | null>(null);
  const [seasonAverages, setSeasonAverages] = useState<SeasonAverages | null>(null);
  const [fullSeasonStats, setFullSeasonStats] = useState<GameStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [activeProp, setActiveProp] = useState('PTS');
  const [activeTimeFilter, setActiveTimeFilter] = useState('2025');
  const [injuryCollapsed, setInjuryCollapsed] = useState(false);
  const [oddsCollapsed, setOddsCollapsed] = useState(false);
  const [altLinesCollapsed, setAltLinesCollapsed] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    home: false,
    away: false,
    regSeason: false,
    playoffs: false,
    win: false,
    loss: false,
    twoDaysRest: false
  });
  
  // Data state
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [odds, setOdds] = useState<Odds[]>([]);
  const [altLines, setAltLines] = useState<AltLine[]>([]);
  const [currentLine, setCurrentLine] = useState(8.5);
  
  // Loading states
  const [injuriesLoading, setInjuriesLoading] = useState(false);
  const [oddsLoading, setOddsLoading] = useState(false);
  const [altLinesLoading, setAltLinesLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  const statCategories = ['PTS', 'REB', 'AST', 'PRA', 'PA', 'PR', 'RA', '3PTM'];
  const timeFilters = ['2025', 'H2H', 'L5', 'L10', 'L30', '2024', 'Full', '1H'];

  // API configuration
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'YOUR_API_KEY';
  
  // Helper function to make API calls with authorization
  const apiCall = async (url: string) => {
    const response = await fetch(url, {
      headers: {
        'Authorization': API_KEY
      }
    });
    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }
    return response.json();
  };

  // Helper function to get stat value from game
  const getStatValue = (game: GameStat, statKey: string): number => {
    const key = statKey.toLowerCase();
    switch (key) {
      case 'pts': return game.pts;
      case 'reb': return game.reb;
      case 'ast': return game.ast;
      case 'stl': return game.stl;
      case 'blk': return game.blk;
      case '3ptm': return game.fg3m;
      case 'pra': return game.pra;
      case 'pa': return game.pa;
      case 'pr': return game.pr;
      case 'ra': return game.ra;
      default: return 0;
    }
  };

  // Helper function to filter stats based on time filter
  const filterStatsByTime = (stats: GameStat[], timeFilter: string): GameStat[] => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    switch (timeFilter) {
      case '2025':
        return stats.filter(stat => new Date(stat.game.date).getFullYear() === 2025);
      case '2024':
        return stats.filter(stat => new Date(stat.game.date).getFullYear() === 2024);
      case 'L5':
        return stats.slice(0, 5);
      case 'L10':
        return stats.slice(0, 10);
      case 'L30':
        return stats.slice(0, 30);
      case 'H2H':
        // For H2H, we'd need opponent info - for now return last 10
        return stats.slice(0, 10);
      case '1H':
        // First half of season - approximate
        const midSeason = new Date(currentYear, 1, 1); // Feb 1st
        return stats.filter(stat => new Date(stat.game.date) < midSeason);
      case 'Full':
      default:
        return stats;
    }
  };

  // Helper function to apply additional filters
  const applyFilters = (stats: GameStat[]): GameStat[] => {
    return stats.filter(stat => {
      if (filters.home && !stat.game.isHome) return false;
      if (filters.away && stat.game.isHome) return false;
      if (filters.regSeason && stat.game.date.includes('playoff')) return false;
      if (filters.playoffs && !stat.game.date.includes('playoff')) return false;
      // Add more filter logic as needed
      return true;
    });
  };

  // Calculate hit rate for given stats and line
  const calculateHitRate = (stats: GameStat[], statKey: string, line: number): HitRateData => {
    const hits = stats.filter(stat => getStatValue(stat, statKey) >= line).length;
    const total = stats.length;
    const hitRate = total > 0 ? (hits / total) * 100 : 0;
    return { hits, total, hitRate };
  };

  // Memoized filtered stats based on time filter and additional filters
  const filteredStats = useMemo(() => {
    const timeFiltered = filterStatsByTime(fullSeasonStats, activeTimeFilter);
    return applyFilters(timeFiltered);
  }, [fullSeasonStats, activeTimeFilter, filters]);

  // Memoized hit rate calculations for all time filters
  const hitRateData = useMemo(() => {
    const results: { [key: string]: HitRateData } = {};
    
    timeFilters.forEach(timeFilter => {
      const timeFilteredStats = filterStatsByTime(fullSeasonStats, timeFilter);
      const finalStats = applyFilters(timeFilteredStats);
      results[timeFilter] = calculateHitRate(finalStats, activeProp, currentLine);
    });
    
    return results;
  }, [fullSeasonStats, activeProp, currentLine, filters]);

  // Memoized chart data
  const chartData = useMemo(() => {
    return filteredStats.map(stat => ({
      x: stat.game.date,
      y: getStatValue(stat, activeProp),
      isHit: getStatValue(stat, activeProp) >= currentLine
    }));
  }, [filteredStats, activeProp, currentLine]);

  // Memoized minutes and fouls data for mini charts
  const miniChartData = useMemo(() => {
    const recentGames = filteredStats.slice(0, 10);
    return {
      minutes: recentGames.map(stat => parseFloat(stat.min) || 0),
      fouls: recentGames.map(stat => stat.turnover || 0) // Using turnover as proxy for fouls
    };
  }, [filteredStats]);

  useEffect(() => {
    if (playerId) {
      fetchPlayerData();
      fetchInjuries();
      fetchOdds();
      fetchAltLines();
    }
  }, [playerId]);

  const fetchPlayerData = async () => {
    try {
      setLoading(true);
      setStatsLoading(true);
      setError(null);

      // Fetch player details
      const playerData = await apiCall(`/api/players/${playerId}`);
      setPlayer(playerData.player);

      // Fetch season averages
      try {
        const averagesData = await apiCall(`/api/season-averages?playerId=${playerId}&season=2025`);
        setSeasonAverages(averagesData.averages);
      } catch (error) {
        console.error('Error fetching season averages:', error);
      }

      // Fetch full season stats with pagination
      await fetchFullSeasonStats();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchFullSeasonStats = async () => {
    try {
      setStatsLoading(true);
      let allStats: GameStat[] = [];
      let cursor: string | undefined;
      
      do {
        const url = `/api/stats?playerId=${playerId}&seasons[]=2025&postseason=false&per_page=100${cursor ? `&cursor=${cursor}` : ''}`;
        const response = await apiCall(url);
        
        allStats = [...allStats, ...(response.data || [])];
        cursor = response.meta?.next_cursor;
      } while (cursor);
      
      // Sort by date descending (most recent first)
      allStats.sort((a, b) => new Date(b.game.date).getTime() - new Date(a.game.date).getTime());
      setFullSeasonStats(allStats);
      
    } catch (error) {
      console.error('Error fetching full season stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchInjuries = async () => {
    try {
      setInjuriesLoading(true);
      const data = await apiCall(`/api/injuries?playerId=${playerId}`);
      setInjuries(data.injuries || []);
    } catch (error) {
      console.error('Error fetching injuries:', error);
      setInjuries([]);
    } finally {
      setInjuriesLoading(false);
    }
  };

  const fetchOdds = async () => {
    try {
      setOddsLoading(true);
      const data = await apiCall(`/api/odds?playerId=${playerId}`);
      // Sort odds alphabetically by book name and take top 5
      const sortedOdds = (data.odds || []).sort((a: Odds, b: Odds) => a.book.localeCompare(b.book)).slice(0, 5);
      setOdds(sortedOdds);
    } catch (error) {
      console.error('Error fetching odds:', error);
      setOdds([]);
    } finally {
      setOddsLoading(false);
    }
  };

  const fetchAltLines = async () => {
    try {
      setAltLinesLoading(true);
      const data = await apiCall(`/api/alt-lines?playerId=${playerId}`);
      // Calculate hit rates for each line using real stats
      const linesWithHitRates = (data.lines || []).map((line: any) => ({
        ...line,
        hitRate: calculateHitRate(fullSeasonStats, activeProp, line.line).hitRate
      }));
      setAltLines(linesWithHitRates);
    } catch (error) {
      console.error('Error fetching alt lines:', error);
      setAltLines([]);
    } finally {
      setAltLinesLoading(false);
    }
  };

  // Function to toggle filters
  const toggleFilter = (filterKey: keyof FilterState) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: !prev[filterKey]
    }));
  };

  // Function to get current line from odds
  const getCurrentLineFromOdds = () => {
    if (odds.length > 0) {
      return odds[0].line;
    }
    return currentLine;
  };

  // Update current line when odds change
  useEffect(() => {
    if (odds.length > 0) {
      setCurrentLine(odds[0].line);
    }
  }, [odds]);

  // Refetch alt lines when active prop or stats change
  useEffect(() => {
    if (fullSeasonStats.length > 0) {
      fetchAltLines();
    }
  }, [activeProp, fullSeasonStats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Error loading player
          </h2>
          <p className="text-gray-400 mb-4">
            {error || 'Player not found'}
          </p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <div className="container mx-auto px-4 py-6">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1">
            {/* Stat Category Pills */}
            <div className="mb-4">
              <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 pb-2">
                {statCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveProp(category)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                      activeProp === category
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Filter Pills */}
            <div className="mb-6">
              <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 pb-2">
                {timeFilters.map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveTimeFilter(filter)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                      activeTimeFilter === filter
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Enhanced Player Header - Props.Cash Style */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 mb-6 border border-gray-700 shadow-xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    {player.firstName.charAt(0)}{player.lastName.charAt(0)}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-1">
                      {player.firstName} {player.lastName}
                    </h1>
                    <div className="flex items-center space-x-3 text-sm">
                      <span className="bg-blue-600 text-white px-2 py-1 rounded-full font-medium">
                        {player.position}
                      </span>
                      <span className="text-gray-300">
                        {player.teamCity} {player.teamAbbreviation}
                      </span>
                      <span className="text-gray-400">
                        #{player.jerseyNumber}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-600">
                    <div className="text-white font-bold text-lg mb-1">
                      {currentLine} {activeProp}
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      {odds.length > 0 ? (
                        <>
                          <div className="bg-green-600/20 text-green-400 px-2 py-1 rounded font-semibold">
                            O {odds[0].overPrice}
                          </div>
                          <div className="bg-red-600/20 text-red-400 px-2 py-1 rounded font-semibold">
                            U {odds[0].underPrice}
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-400 animate-pulse">Loading odds...</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hit-Rate Visual Grid - Props.Cash Style */}
            <div className="mb-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { key: '2025', label: '2025 Season', color: 'bg-blue-600' },
                  { key: 'L5', label: 'Last 5', color: 'bg-green-600' },
                  { key: 'L10', label: 'Last 10', color: 'bg-purple-600' },
                  { key: 'L30', label: 'Last 30', color: 'bg-orange-600' },
                  { key: 'H2H', label: 'Head to Head', color: 'bg-red-600' },
                  { key: '2024', label: '2024 Season', color: 'bg-gray-600' }
                ].map(({ key, label, color }) => {
                  const data = hitRateData[key];
                  const hitRate = data?.hitRate || 0;
                  const hits = data?.hits || 0;
                  const total = data?.total || 0;
                  
                  return (
                    <div key={key} className={`${color} rounded-lg p-3 text-white text-center transition-all hover:scale-105 cursor-pointer`}>
                      <div className="text-xs font-medium text-gray-200 mb-1">{label}</div>
                      <div className="text-2xl font-bold">{hitRate.toFixed(0)}%</div>
                      <div className="text-xs text-gray-200">{hits}/{total}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Main Chart - Enhanced Props.Cash Style */}
            <div className="mb-6">
              <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 rounded-xl shadow-xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white font-bold text-lg flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-400" />
                      {activeProp} Performance Chart
                    </CardTitle>
                    <div className="text-sm text-gray-400">
                      Line: <span className="text-white font-semibold">{currentLine}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  {chartData.length > 0 ? (
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <PropChart
                        gameOutcomes={chartData}
                        propLine={currentLine}
                        propType={activeProp.toLowerCase()}
                      />
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-400 bg-gray-900/30 rounded-lg">
                      <div className="text-center">
                        <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-500" />
                        <p className="text-lg font-medium">{statsLoading ? 'Loading chart data...' : 'No chart data available'}</p>
                        <p className="text-sm text-gray-500 mt-1">Select a different prop or time filter</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Filter Pills */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setAltLinesCollapsed(!altLinesCollapsed)}
                  className="px-3 py-1 rounded-full text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                >
                  Alt Lines ▲▼
                </button>
                <button
                  onClick={() => toggleFilter('home')}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    filters.home ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  HOME
                </button>
                <button
                  onClick={() => toggleFilter('away')}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    filters.away ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  AWAY
                </button>
                <button
                  onClick={() => toggleFilter('regSeason')}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    filters.regSeason ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  REG SEASON
                </button>
                <button
                  onClick={() => toggleFilter('playoffs')}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    filters.playoffs ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  PLAYOFFS
                </button>
                <button
                  onClick={() => toggleFilter('win')}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    filters.win ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  WIN
                </button>
                <button
                  onClick={() => toggleFilter('loss')}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    filters.loss ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  LOSS
                </button>
                <button
                  onClick={() => toggleFilter('twoDaysRest')}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    filters.twoDaysRest ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  2 DAYS REST
                </button>
              </div>
            </div>

            {/* Two-Card Grid for Mini Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Minutes Chart */}
              <Card className="bg-gray-800 border-gray-700 rounded-lg shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg flex justify-between items-center">
                    Minutes
                    <span className="text-sm font-normal text-gray-400">
                      Avg: {miniChartData.minutes.length > 0 ? (miniChartData.minutes.reduce((a, b) => a + b, 0) / miniChartData.minutes.length).toFixed(1) : '0.0'}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-32 flex items-end justify-center space-x-1">
                    {miniChartData.minutes.length > 0 ? (
                      miniChartData.minutes.map((value, index) => {
                        const maxValue = Math.max(...miniChartData.minutes, 35);
                        return (
                          <div
                            key={index}
                            className="bg-gray-600 rounded-t"
                            style={{
                              height: `${(value / maxValue) * 100}%`,
                              width: `${90 / miniChartData.minutes.length}%`
                            }}
                          />
                        );
                      })
                    ) : (
                      <div className="text-gray-400 text-sm">No data available</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Fouls Drawn Chart */}
              <Card className="bg-gray-800 border-gray-700 rounded-lg shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg flex justify-between items-center">
                    Fouls Drawn
                    <span className="text-sm font-normal text-gray-400">
                      Avg: {miniChartData.fouls.length > 0 ? (miniChartData.fouls.reduce((a, b) => a + b, 0) / miniChartData.fouls.length).toFixed(1) : '0.0'}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-32 flex items-end justify-center space-x-1">
                    {miniChartData.fouls.length > 0 ? (
                      miniChartData.fouls.map((value, index) => {
                        const maxValue = Math.max(...miniChartData.fouls, 4);
                        return (
                          <div
                            key={index}
                            className="bg-gray-600 rounded-t"
                            style={{
                              height: `${(value / maxValue) * 100}%`,
                              width: `${90 / miniChartData.fouls.length}%`
                            }}
                          />
                        );
                      })
                    ) : (
                      <div className="text-gray-400 text-sm">No data available</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 space-y-4">
            {/* Injury Report Card */}
            <Card className="bg-gray-800 border-gray-700 rounded-lg shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    Injury Report
                    <span className="bg-gray-600 text-white text-xs px-2 py-1 rounded-full">
                      {injuries.length}
                    </span>
                  </CardTitle>
                  <button
                    onClick={() => setInjuryCollapsed(!injuryCollapsed)}
                    className="text-gray-400 hover:text-white"
                  >
                    {injuryCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>
              </CardHeader>
              {!injuryCollapsed && (
                <CardContent className="pt-0">
                  <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600">
                    {injuries.length > 0 ? (
                      injuries.map((injury) => (
                        <div key={injury.id} className="flex justify-between items-center text-sm">
                          <div>
                            <div className="text-white font-medium">{injury.player}</div>
                            <div className="text-gray-400">{injury.description}</div>
                          </div>
                          <div className="text-right">
                            <div className={`text-xs px-2 py-1 rounded ${
                              injury.status === 'OUT' ? 'bg-red-800 text-red-200' : 'bg-yellow-800 text-yellow-200'
                            }`}>
                              {injury.status}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-400 py-4">
                        No injury reports
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Odds Card - Enhanced Props.Cash Style */}
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 rounded-xl shadow-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-green-400" />
                    Live Odds
                    <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                      {odds.length}
                    </span>
                  </CardTitle>
                  <button
                    onClick={() => setOddsCollapsed(!oddsCollapsed)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {oddsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>
              </CardHeader>
              {!oddsCollapsed && (
                <CardContent className="pt-0">
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <div className="grid grid-cols-4 gap-3 text-xs text-gray-400 font-semibold border-b border-gray-600 pb-3 mb-3">
                      <div>SPORTSBOOK</div>
                      <div className="text-center">LINE</div>
                      <div className="text-center">OVER</div>
                      <div className="text-center">UNDER</div>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600">
                      {odds.length > 0 ? (
                        odds.map((odd, index) => (
                          <div key={index} className="grid grid-cols-4 gap-3 text-sm bg-gray-800/50 rounded-lg p-3 hover:bg-gray-700/50 transition-colors">
                            <div className="text-white font-medium truncate">{odd.book}</div>
                            <div className="text-center text-blue-400 font-semibold">{odd.line}</div>
                            <div className="text-center text-green-400 font-semibold">{odd.overPrice}</div>
                            <div className="text-center text-red-400 font-semibold">{odd.underPrice}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-400 py-8">
                          <Target className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                          <p className="font-medium">{oddsLoading ? 'Loading odds...' : 'No odds available'}</p>
                          <p className="text-xs text-gray-500 mt-1">Check back later for live odds</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Alt Lines Card - Enhanced Props.Cash Style */}
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 rounded-xl shadow-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-400" />
                    Alternative Lines
                    <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                      {altLines.length}
                    </span>
                  </CardTitle>
                  <button
                    onClick={() => setAltLinesCollapsed(!altLinesCollapsed)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {altLinesCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>
              </CardHeader>
              {!altLinesCollapsed && (
                <CardContent className="pt-0">
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4 text-xs text-gray-400 font-semibold border-b border-gray-600 pb-3 mb-3">
                      <div>LINE</div>
                      <div className="text-center">ODDS</div>
                      <div className="text-center">HIT RATE</div>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600">
                      {altLines.length > 0 ? (
                        altLines.map((line, index) => {
                          const hitRate = line.hitRate;
                          const hitRateColor = hitRate >= 60 ? 'text-green-400' : hitRate >= 40 ? 'text-yellow-400' : 'text-red-400';
                          
                          return (
                            <div key={index} className="grid grid-cols-3 gap-4 text-sm bg-gray-800/50 rounded-lg p-3 hover:bg-gray-700/50 transition-colors">
                              <div className="text-white font-semibold">{line.line}</div>
                              <div className="text-center text-blue-400 font-medium">{line.odds}</div>
                              <div className={`text-center font-semibold ${hitRateColor}`}>{hitRate.toFixed(0)}%</div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center text-gray-400 py-8">
                          <Activity className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                          <p className="font-medium">{altLinesLoading ? 'Loading alternate lines...' : 'No alternate lines available'}</p>
                          <p className="text-xs text-gray-500 mt-1">Alternative betting lines will appear here</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
