'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { TrendingUp, BarChart3, Target, Activity } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PropChart from './PropChart';
import StatsTable from './StatsTable';
import AdvancedAnalytics from './AdvancedAnalytics';
import { PropFilter, PropAnalysis, GameOutcome } from '@/lib/services/prop-analytics';

interface PropAnalyzerProps {
  playerId: number;
  playerName: string;
  filters: PropFilter;
}

const PROP_TYPES = [
  { value: 'pts', label: 'Puntos' },
  { value: 'reb', label: 'Rebotes' },
  { value: 'ast', label: 'Asistencias' },
  { value: 'stl', label: 'Robos' },
  { value: 'blk', label: 'Bloqueos' },
  { value: 'turnover', label: 'Pérdidas' },
  { value: 'pra', label: 'Puntos + Rebotes + Asistencias' },
  { value: 'pr', label: 'Puntos + Rebotes' },
  { value: 'pa', label: 'Puntos + Asistencias' },
  { value: 'ra', label: 'Rebotes + Asistencias' },
  { value: 'fg3m', label: 'Triples Anotados' },
  { value: 'fgm', label: 'Tiros de Campo Anotados' },
  { value: 'ftm', label: 'Tiros Libres Anotados' }
];

export default function PropAnalyzer({ playerId, playerName, filters }: PropAnalyzerProps) {
  const t = useTranslations();
  const [selectedPropType, setSelectedPropType] = useState('pts');
  const [propLine, setPropLine] = useState<number>(20);
  const [analysis, setAnalysis] = useState<PropAnalysis | null>(null);
  const [gameOutcomes, setGameOutcomes] = useState<GameOutcome[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-analyze when inputs change
  useEffect(() => {
    if (playerId && selectedPropType && propLine > 0) {
      analyzeProp();
    }
  }, [playerId, selectedPropType, propLine, filters]);

  const analyzeProp = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/analyze-prop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId,
          propType: selectedPropType,
          propLine,
          filters
        })
      });

      if (!response.ok) {
        throw new Error('Error al analizar el prop');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      setGameOutcomes(data.gameOutcomes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setAnalysis(null);
      setGameOutcomes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Prop Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Target className="w-6 h-6 mr-2 text-blue-600" />
          Análisis de Props - {playerName}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('props.type')}
            </label>
            <select
              value={selectedPropType}
              onChange={(e) => setSelectedPropType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {PROP_TYPES.map((prop) => (
                <option key={prop.value} value={prop.value}>
                  {prop.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('props.line')}
            </label>
            <input
              type="number"
              value={propLine}
              onChange={(e) => setPropLine(parseFloat(e.target.value) || 0)}
              step="0.5"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Ej: 20.5"
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">{t('common.loading')}</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* No Data State */}
      {analysis && analysis.noDataAvailable && !isLoading && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
              <Activity className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                No hay datos disponibles
              </h3>
              <p className="text-yellow-700 dark:text-yellow-300 max-w-md">
                No se encontraron estadísticas para <strong>{playerName}</strong> con los filtros aplicados.
                Intenta ajustar los filtros o seleccionar un período de tiempo diferente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && !analysis.noDataAvailable && !isLoading && (
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Análisis Básico</TabsTrigger>
            <TabsTrigger value="advanced">Análisis Avanzado</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('props.hitRate')}
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {formatPercentage(analysis.hitRate)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('props.average')}
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {formatNumber(analysis.average)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <span className="text-green-600 dark:text-green-400 font-bold">+</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Over
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {analysis.overCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <span className="text-red-600 dark:text-red-400 font-bold">-</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Under
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {analysis.underCount}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('chart.title')}
            </h3>
            <PropChart
              gameOutcomes={gameOutcomes}
              propLine={propLine}
              propType={selectedPropType}
            />
          </div>

          {/* Recent Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('recentForm.title')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  {t('recentForm.last5')}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Tasa: {formatPercentage(analysis.recentForm.last5.hitRate)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Promedio: {formatNumber(analysis.recentForm.last5.average)}
                </p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  {t('recentForm.last10')}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Tasa: {formatPercentage(analysis.recentForm.last10.hitRate)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Promedio: {formatNumber(analysis.recentForm.last10.average)}
                </p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  {t('recentForm.last20')}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Tasa: {formatPercentage(analysis.recentForm.last20.hitRate)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Promedio: {formatNumber(analysis.recentForm.last20.average)}
                </p>
              </div>
            </div>
          </div>

          {/* Home/Away Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('homeAway.title')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  {t('homeAway.homeStats')} ({analysis.homeAwayStats.home.games} partidos)
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Tasa: {formatPercentage(analysis.homeAwayStats.home.hitRate)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Promedio: {formatNumber(analysis.homeAwayStats.home.average)}
                </p>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  {t('homeAway.awayStats')} ({analysis.homeAwayStats.away.games} partidos)
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Tasa: {formatPercentage(analysis.homeAwayStats.away.hitRate)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Promedio: {formatNumber(analysis.homeAwayStats.away.average)}
                </p>
              </div>
            </div>
          </div>

            {/* Game-by-Game Table */}
            <StatsTable gameOutcomes={gameOutcomes} propLine={propLine} />
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <AdvancedAnalytics 
              playerId={playerId}
              propType={selectedPropType}
              season="2023-24"
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}