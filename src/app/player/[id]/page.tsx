'use client';

import { useState, useEffect } from 'react';
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
  id: number;
  book: string;
  line: number;
  over: string;
  under: string;
  propType: string;
}

interface AltLine {
  id: number;
  line: number;
  odds: string;
  hitRate: number;
  propType: string;
}

export default function PlayerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const playerId = params.id as string;

  const [player, setPlayer] = useState<Player | null>(null);
  const [seasonAverages, setSeasonAverages] = useState<SeasonAverages | null>(null);
  const [recentStats, setRecentStats] = useState<GameStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // New state for UI controls
  const [activeProp, setActiveProp] = useState('PTS');
  const [activeToggle, setActiveToggle] = useState('2025');
  const [injuryCollapsed, setInjuryCollapsed] = useState(false);
  const [oddsCollapsed, setOddsCollapsed] = useState(false);
  const [altLinesCollapsed, setAltLinesCollapsed] = useState(false);
  
  // Real data state
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [odds, setOdds] = useState<Odds[]>([]);
  const [altLines, setAltLines] = useState<AltLine[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [currentLine, setCurrentLine] = useState(18.5);
  
  // Loading states for different sections
  const [injuriesLoading, setInjuriesLoading] = useState(false);
  const [oddsLoading, setOddsLoading] = useState(false);
  const [altLinesLoading, setAltLinesLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const propTypes: string[] = ['PTS', 'REB', 'AST', 'PRA', 'PA', 'PR', 'RA', '3PTM'];
  const toggleOptions: string[] = ['2025', 'H2H', 'L5', 'L10', 'L30', '2024', 'Full', '1H'];
  const filterOptions: string[] = ['Alt Lines ▲▼', 'HOME', 'AWAY', 'REG SEASON', 'PLAYOFFS', 'WIN', 'LOSS', '2 DAYS REST'];

  useEffect(() => {
    if (playerId) {
      fetchPlayerData();
      fetchAnalytics();
      fetchInjuries();
      fetchOdds();
      fetchAltLines();
    }
  }, [playerId]);

  useEffect(() => {
    if (playerId && player) {
      fetchAnalytics();
      fetchAltLines();
    }
  }, [activeProp, activeToggle, currentLine]);

  const fetchPlayerData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch player details
      const playerResponse = await fetch(`/api/players/${playerId}`);
      if (!playerResponse.ok) {
        throw new Error('Error al cargar datos del jugador');
      }
      const playerData = await playerResponse.json();
      setPlayer(playerData.player);

      // Fetch season averages
      const averagesResponse = await fetch(`/api/season-averages?playerId=${playerId}&season=2024`);
      if (averagesResponse.ok) {
        const averagesData = await averagesResponse.json();
        setSeasonAverages(averagesData.averages);
      }

      // Fetch recent stats (last 10 games)
      const statsResponse = await fetch(`/api/stats?playerId=${playerId}&limit=10`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setRecentStats(statsData.stats || []);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!player) return;
    
    try {
      setAnalyticsLoading(true);
      const propTypeMap: { [key: string]: string } = {
        'PTS': 'pts',
        'REB': 'reb', 
        'AST': 'ast',
        'PRA': 'pra',
        'PA': 'pa',
        'PR': 'pr',
        'RA': 'ra',
        '3PTM': '3ptm'
      };
      
      const mappedPropType = propTypeMap[activeProp] || 'pts';
      const response = await fetch(
        `/api/player-analytics?playerId=${playerId}&propType=${mappedPropType}&line=${currentLine}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchInjuries = async () => {
    if (!player) return;
    
    try {
      setInjuriesLoading(true);
      const response = await fetch(`/api/injuries?team_ids[]=${player.teamId}`);
      if (response.ok) {
        const data = await response.json();
        setInjuries(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching injuries:', error);
    } finally {
      setInjuriesLoading(false);
    }
  };

  const fetchOdds = async () => {
    try {
      setOddsLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/odds?date=${today}`);
      if (response.ok) {
        const data = await response.json();
        // Filter for relevant prop odds
        const propOdds = data.data.filter((odd: any) => 
          odd.type === 'over/under' || odd.type === 'spread'
        ).slice(0, 5); // Limit to 5 books
        setOdds(propOdds.map((odd: any, index: number) => ({
          id: index + 1,
          book: odd.book,
          line: parseFloat(odd.overUnder || currentLine),
          over: odd.oddsAmericanHome,
          under: odd.oddsAmericanVisitor,
          propType: activeProp
        })));
      }
    } catch (error) {
      console.error('Error fetching odds:', error);
      // Fallback to demo data if API fails
      setOdds([
        { id: 1, book: 'DraftKings', line: currentLine, over: '-102', under: '-128', propType: activeProp },
        { id: 2, book: 'FanDuel', line: currentLine, over: '-105', under: '-125', propType: activeProp },
        { id: 3, book: 'BetMGM', line: currentLine, over: '-110', under: '-120', propType: activeProp }
      ]);
    } finally {
      setOddsLoading(false);
    }
  };

  const fetchAltLines = async () => {
    try {
      setAltLinesLoading(true);
      const propTypeMap: { [key: string]: string } = {
        'PTS': 'pts',
        'REB': 'reb',
        'AST': 'ast', 
        'PRA': 'pra',
        'PA': 'pa',
        'PR': 'pr',
        'RA': 'ra',
        '3PTM': '3ptm'
      };
      
      const mappedPropType = propTypeMap[activeProp] || 'pts';
      const response = await fetch(
        `/api/alt-lines?playerId=${playerId}&propType=${mappedPropType}&baseLine=${currentLine}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setAltLines(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching alt lines:', error);
    } finally {
      setAltLinesLoading(false);
    }
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatNumber = (value: number) => {
    return value.toFixed(1);
  };

  const getStatColor = (current: number, average: number) => {
    if (current > average * 1.1) return 'text-green-600 bg-green-50';
    if (current < average * 0.9) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Error al cargar jugador
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error || 'No se pudo encontrar el jugador'}
          </p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver al Dashboard
          </button>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                  {player.firstName[0]}{player.lastName[0]}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {player.firstName} {player.lastName}
                  </h1>
                  <div className="flex items-center space-x-4 mt-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      #{player.jerseyNumber} • {player.position}
                    </Badge>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      {player.teamAbbreviation} • {player.teamName}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  📏 {player.height} • ⚖️ {player.weight}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  🎓 {player.college || 'N/A'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  🌍 {player.country || 'USA'}
                </p>
                {player.draftYear && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    📅 Draft {player.draftYear} R{player.draftRound} #{player.draftNumber}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1">
            {/* Back Button & Top Controls */}
            <div className="flex items-center mb-6">
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-300 hover:text-white transition-colors mr-6"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              {/* Prop Type Pills */}
              <div className="flex flex-wrap gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600">
                {propTypes.map((prop: string) => (
                  <button
                    key={prop}
                    onClick={() => setActiveProp(prop)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                      activeProp === prop
                        ? 'bg-green-600 text-white border-2 border-green-500'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {prop}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Bar */}
            <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600">
              {toggleOptions.map((option: string) => (
                <button
                  key={option}
                  onClick={() => setActiveToggle(option)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                    activeToggle === option
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            {/* Header & Hit-Rate Row */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-4">
                  {/* Player Avatar */}
                  <div className="relative">
                    <img
                      src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.id}.png`}
                      alt={`${player.firstName} ${player.lastName}`}
                      className="w-16 h-16 rounded-full bg-gray-700 object-cover border-2 border-gray-600"
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLDivElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div 
                      className="w-16 h-16 rounded-full bg-gray-700 border-2 border-gray-600 items-center justify-center text-white font-bold text-lg"
                      style={{ display: 'none' }}
                    >
                      {player.firstName.charAt(0)}{player.lastName.charAt(0)}
                    </div>
                  </div>
                  
                  {/* Player Info */}
                  <div className="text-white">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl font-bold">{player.firstName} {player.lastName}</span>
                      {/* Team Logo */}
                      <img
                        src={`https://cdn.nba.com/logos/nba/${player.teamId}/primary/L/logo.svg`}
                        alt={player.teamAbbreviation}
                        className="w-6 h-6 object-contain"
                        onError={(e) => {
                          // Fallback to text if team logo fails
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                    <span className="text-gray-400">{player.position} | {player.teamAbbreviation}</span>
                  </div>
                </div>
                
                <div className="text-white text-right">
                  <span className="text-lg font-bold">{currentLine} {activeProp === 'PTS' ? 'Points' : activeProp === 'REB' ? 'Rebounds' : activeProp === 'AST' ? 'Assists' : activeProp}</span>
                  {odds.length > 0 && (
                    <>
                      <span className="text-green-400 ml-2">O {odds[0].over}</span>
                      <span className="text-red-400 ml-2">U {odds[0].under}</span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Badge Row */}
              <div className="flex flex-wrap gap-2">
                {analytics && (
                  <>
                    <Badge className="bg-gray-700 text-white">
                      2025 {analytics.season.hitRate.toFixed(0)}%
                    </Badge>
                    {analytics.splits.h2h && (
                      <Badge className="bg-gray-700 text-white">
                        H2H {analytics.splits.h2h.hitRate.toFixed(0)}%
                      </Badge>
                    )}
                    <Badge className="bg-gray-700 text-white">
                      L5 {analytics.splits.last5.hitRate.toFixed(0)}%
                    </Badge>
                    <Badge className="bg-gray-700 text-white">
                      L10 {analytics.splits.last10.hitRate.toFixed(0)}%
                    </Badge>
                    <Badge className="bg-gray-700 text-white">
                      L20 {analytics.splits.last20.hitRate.toFixed(0)}%
                    </Badge>
                    <Badge className="bg-gray-700 text-white">
                      HOME {analytics.splits.home.hitRate.toFixed(0)}%
                    </Badge>
                    <Badge className="bg-gray-700 text-white">
                      AWAY {analytics.splits.away.hitRate.toFixed(0)}%
                    </Badge>
                  </>
                )}
                {analyticsLoading && (
                  <Badge className="bg-gray-600 text-gray-300 animate-pulse">
                    Cargando...
                  </Badge>
                )}
              </div>
            </div>

            {/* Chart */}
            <div className="mb-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                  {analytics && analytics.chartData.length > 0 ? (
                    <PropChart
                      gameOutcomes={analytics.chartData}
                      propLine={currentLine}
                      propType={activeProp.toLowerCase()}
                    />
                  ) : analyticsLoading ? (
                    <div className="text-center py-8 text-gray-400">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p>Cargando datos del gráfico...</p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                      <p>No hay datos de gráfico disponibles</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2 mb-6">
              {filterOptions.map((filter: string) => (
                <button
                  key={filter}
                  className="px-3 py-1 rounded-full text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium">Minutos</span>
                    <span className="text-white text-lg font-bold">
                      {seasonAverages ? parseFloat(seasonAverages.min?.toString() || '0').toFixed(1) : '--'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ 
                        width: seasonAverages ? `${Math.min((parseFloat(seasonAverages.min?.toString() || '0') / 48) * 100, 100)}%` : '0%' 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {seasonAverages ? `${Math.round((parseFloat(seasonAverages.min?.toString() || '0') / 48) * 100)}% de 48 min` : 'Sin datos'}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium">Robos</span>
                    <span className="text-white text-lg font-bold">
                      {seasonAverages ? parseFloat(seasonAverages.stl?.toString() || '0').toFixed(1) : '--'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ 
                        width: seasonAverages ? `${Math.min((parseFloat(seasonAverages.stl?.toString() || '0') / 3) * 100, 100)}%` : '0%' 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {seasonAverages ? `${Math.round((parseFloat(seasonAverages.stl?.toString() || '0') / 3) * 100)}% de 3.0 máx` : 'Sin datos'}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:w-80 space-y-4">
            {/* Injury Report */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white text-sm">Injury Report</CardTitle>
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
                  {injuriesLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-gray-400 text-xs">Cargando lesiones...</p>
                    </div>
                  ) : injuries.length > 0 ? (
                    <div className="text-xs">
                      <div className="grid grid-cols-3 gap-2 mb-2 text-gray-400 font-medium">
                        <span>PLAYER</span>
                        <span>STATUS</span>
                        <span>DESCRIPTION</span>
                      </div>
                      {injuries.slice(0, 5).map((injury) => (
                        <div key={injury.id} className="grid grid-cols-3 gap-2 py-1 text-white">
                          <span className="truncate">{injury.player}</span>
                          <span className={injury.status === 'Out' ? 'text-red-400' : injury.status === 'Questionable' ? 'text-yellow-400' : 'text-green-400'}>
                            {injury.status}
                          </span>
                          <span className="truncate text-gray-300">{injury.description}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-400 text-xs">
                      No hay lesiones reportadas
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Odds */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white text-sm">Odds</CardTitle>
                  <button
                    onClick={() => setOddsCollapsed(!oddsCollapsed)}
                    className="text-gray-400 hover:text-white"
                  >
                    {oddsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>
              </CardHeader>
              {!oddsCollapsed && (
                <CardContent className="pt-0">
                  {oddsLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-gray-400 text-xs">Cargando odds...</p>
                    </div>
                  ) : odds.length > 0 ? (
                    <div className="text-xs">
                      <div className="grid grid-cols-4 gap-2 mb-2 text-gray-400 font-medium">
                        <span>BOOK</span>
                        <span>L</span>
                        <span>O</span>
                        <span>U</span>
                      </div>
                      {odds.map((odd) => (
                        <div key={odd.id} className="grid grid-cols-4 gap-2 py-1 text-white">
                          <span className="truncate">{odd.book}</span>
                          <span>{odd.line}</span>
                          <span className="text-green-400">{odd.over}</span>
                          <span className="text-red-400">{odd.under}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-400 text-xs">
                      No hay odds disponibles
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Alt Lines */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white text-sm">Alt Lines</CardTitle>
                  <button
                    onClick={() => setAltLinesCollapsed(!altLinesCollapsed)}
                    className="text-gray-400 hover:text-white"
                  >
                    {altLinesCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>
              </CardHeader>
              {!altLinesCollapsed && (
                <CardContent className="pt-0">
                  {altLinesLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-gray-400 text-xs">Cargando líneas alternativas...</p>
                    </div>
                  ) : altLines.length > 0 ? (
                    <div className="text-xs">
                      <div className="grid grid-cols-3 gap-2 mb-2 text-gray-400 font-medium">
                        <span>LINE ↑</span>
                        <span>ODDS</span>
                        <span>HIT RATE</span>
                      </div>
                      {altLines.map((line) => (
                        <div 
                          key={line.id} 
                          className={`grid grid-cols-3 gap-2 py-1 text-white cursor-pointer hover:bg-gray-700 rounded px-1 ${
                            line.line === currentLine ? 'bg-gray-600' : ''
                          }`}
                          onClick={() => setCurrentLine(line.line)}
                        >
                          <span>{line.line}</span>
                          <span className={line.odds.startsWith('+') ? 'text-green-400' : 'text-red-400'}>
                            {line.odds}
                          </span>
                          <span>{line.hitRate}%</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-400 text-xs">
                      No hay líneas alternativas disponibles
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
