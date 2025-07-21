'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { GameOutcome } from '@/lib/services/prop-analytics';

interface StatsTableProps {
  gameOutcomes: GameOutcome[];
  propType: string;
  propLine: number;
}

type SortField = 'date' | 'opponent' | 'actualValue' | 'result' | 'minutes';
type SortDirection = 'asc' | 'desc';

export default function StatsTable({ gameOutcomes, propType, propLine }: StatsTableProps) {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showAll, setShowAll] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedOutcomes = [...gameOutcomes].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'date':
        aValue = new Date(a.date).getTime();
        bValue = new Date(b.date).getTime();
        break;
      case 'opponent':
        aValue = a.opponent;
        bValue = b.opponent;
        break;
      case 'actualValue':
        aValue = a.actualValue;
        bValue = b.actualValue;
        break;
      case 'result':
        aValue = a.result;
        bValue = b.result;
        break;
      case 'minutes':
        aValue = a.minutes || 0;
        bValue = b.minutes || 0;
        break;
      default:
        return 0;
    }

    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const displayedOutcomes = showAll ? sortedOutcomes : sortedOutcomes.slice(0, 10);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-blue-600" />
      : <ChevronDown className="w-4 h-4 text-blue-600" />;
  };

  const getPropTypeLabel = (propType: string): string => {
    const labels: Record<string, string> = {
      'pts': 'Puntos',
      'reb': 'Rebotes',
      'ast': 'Asistencias',
      'stl': 'Robos',
      'blk': 'Bloqueos',
      'turnover': 'Pérdidas',
      'pra': 'PRA',
      'pr': 'P+R',
      'pa': 'P+A',
      'ra': 'R+A',
      'fg3m': 'Triples',
      'fgm': 'TC Anotados',
      'ftm': 'TL Anotados'
    };
    return labels[propType] || propType;
  };

  if (gameOutcomes.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">📋</div>
          <p>No hay datos disponibles para mostrar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Historial de Partidos - {getPropTypeLabel(propType)}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Línea: {propLine} | Total: {gameOutcomes.length} partidos
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center space-x-1">
                  <span>Fecha</span>
                  {getSortIcon('date')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('opponent')}
              >
                <div className="flex items-center space-x-1">
                  <span>Oponente</span>
                  {getSortIcon('opponent')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Local/Visitante
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('actualValue')}
              >
                <div className="flex items-center space-x-1">
                  <span>{getPropTypeLabel(propType)}</span>
                  {getSortIcon('actualValue')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('minutes')}
              >
                <div className="flex items-center space-x-1">
                  <span>Minutos</span>
                  {getSortIcon('minutes')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('result')}
              >
                <div className="flex items-center space-x-1">
                  <span>Resultado</span>
                  {getSortIcon('result')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {displayedOutcomes.map((outcome, index) => {
              const isOver = outcome.result === 'over';
              const date = new Date(outcome.date);
              
              return (
                <tr 
                  key={`${outcome.gameId}-${index}`}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {format(date, 'dd/MM/yyyy', { locale: es })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {outcome.opponent}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      outcome.isHome 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {outcome.isHome ? 'Local' : 'Visitante'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                    <span className={isOver ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {outcome.actualValue}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {outcome.minutes || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isOver 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {isOver ? 'OVER ✅' : 'UNDER ❌'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {gameOutcomes.length > 10 && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium transition-colors"
          >
            {showAll 
              ? `Mostrar menos (${displayedOutcomes.length} de ${gameOutcomes.length})`
              : `Mostrar todos los ${gameOutcomes.length} partidos`
            }
          </button>
        </div>
      )}
    </div>
  );
}