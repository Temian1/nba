'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, Filter, Calendar, Clock, Home, Plane, Users } from 'lucide-react';
import { PropFilter } from '@/lib/services/prop-analytics';

interface FilterPanelProps {
  filters: PropFilter;
  onFiltersChange: (filters: PropFilter) => void;
  onClose: () => void;
}

interface Team {
  id: number;
  name: string;
  abbreviation: string;
}

interface Player {
  id: number;
  firstName: string;
  lastName: string;
  teamId: number;
}

export default function FilterPanel({ filters, onFiltersChange, onClose }: FilterPanelProps) {
  const t = useTranslations();
  const [localFilters, setLocalFilters] = useState<PropFilter>(filters);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);

  useEffect(() => {
    loadTeams();
    loadPlayers();
  }, []);

  const loadTeams = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/teams');
      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlayers = async () => {
    setIsLoadingPlayers(true);
    try {
      const response = await fetch('/api/players?active=true&limit=500');
      if (response.ok) {
        const data = await response.json();
        setPlayers(data.players || []);
      }
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setIsLoadingPlayers(false);
    }
  };

  const handleFilterChange = (key: keyof PropFilter, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleExcludeTeammateToggle = (playerId: number) => {
    const currentExcluded = localFilters.excludeTeammates || [];
    const isExcluded = currentExcluded.includes(playerId);
    
    if (isExcluded) {
      handleFilterChange('excludeTeammates', currentExcluded.filter(id => id !== playerId));
    } else {
      handleFilterChange('excludeTeammates', [...currentExcluded, playerId]);
    }
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const clearFilters = () => {
    const emptyFilters: PropFilter = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const parseDate = (dateString: string) => {
    return dateString ? new Date(dateString) : undefined;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Filter className="w-5 h-5 mr-2 text-blue-600" />
          {t('filters.title')}
        </h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Home/Away Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Home className="w-4 h-4 inline mr-1" />
            {t('filters.homeAway')}
          </label>
          <select
            value={localFilters.homeAway || ''}
            onChange={(e) => handleFilterChange('homeAway', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">{t('filters.all')}</option>
            <option value="home">{t('filters.home')}</option>
            <option value="away">{t('filters.away')}</option>
          </select>
        </div>

        {/* Minimum Minutes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Clock className="w-4 h-4 inline mr-1" />
            {t('filters.minMinutes')}
          </label>
          <input
            type="number"
            value={localFilters.minMinutes || ''}
            onChange={(e) => handleFilterChange('minMinutes', e.target.value ? parseInt(e.target.value) : undefined)}
            min="0"
            max="48"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Ej: 20"
          />
        </div>

        {/* Last N Games */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('filters.lastNGames')}
          </label>
          <select
            value={localFilters.lastNGames || ''}
            onChange={(e) => handleFilterChange('lastNGames', e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">{t('filters.all')}</option>
            <option value="5">Últimos 5</option>
            <option value="10">Últimos 10</option>
            <option value="15">Últimos 15</option>
            <option value="20">Últimos 20</option>
            <option value="30">Últimos 30</option>
          </select>
        </div>

        {/* Opponent Team */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Plane className="w-4 h-4 inline mr-1" />
            {t('filters.opponent')}
          </label>
          <select
            value={localFilters.opponentTeamId || ''}
            onChange={(e) => handleFilterChange('opponentTeamId', e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            disabled={isLoading}
          >
            <option value="">{t('filters.all')}</option>
            {Array.isArray(teams) && teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} ({team.abbreviation})
              </option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            {t('filters.startDate')}
          </label>
          <input
            type="date"
            value={formatDate(localFilters.startDate)}
            onChange={(e) => handleFilterChange('startDate', parseDate(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            {t('filters.endDate')}
          </label>
          <input
            type="date"
            value={formatDate(localFilters.endDate)}
            onChange={(e) => handleFilterChange('endDate', parseDate(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Exclude Teammates Section */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          <Users className="w-4 h-4 inline mr-1" />
          Excluir Compañeros de Equipo
        </label>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-48 overflow-y-auto">
          {isLoadingPlayers ? (
            <div className="text-center text-gray-500 dark:text-gray-400">
              Cargando jugadores...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {players.map((player) => {
                const isExcluded = (localFilters.excludeTeammates || []).includes(player.id);
                return (
                  <label
                    key={player.id}
                    className="flex items-center space-x-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isExcluded}
                      onChange={() => handleExcludeTeammateToggle(player.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {player.firstName} {player.lastName}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          {!isLoadingPlayers && players.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400">
              No hay jugadores disponibles
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
        <button
          onClick={clearFilters}
          className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
        >
          {t('filters.clear')}
        </button>
        <button
          onClick={applyFilters}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('filters.apply')}
        </button>
      </div>

      {/* Active Filters Summary */}
      {Object.keys(localFilters).length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            Filtros Activos:
          </p>
          <div className="flex flex-wrap gap-2">
            {localFilters.homeAway && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded">
                {localFilters.homeAway === 'home' ? 'Local' : 'Visitante'}
              </span>
            )}
            {localFilters.minMinutes && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded">
                Min. {localFilters.minMinutes} minutos
              </span>
            )}
            {localFilters.lastNGames && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded">
                Últimos {localFilters.lastNGames} partidos
              </span>
            )}
            {localFilters.opponentTeamId && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded">
                vs {Array.isArray(teams) ? teams.find(t => t.id === localFilters.opponentTeamId)?.abbreviation : ''}
              </span>
            )}
            {localFilters.startDate && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded">
                Desde {formatDate(localFilters.startDate)}
              </span>
            )}
            {localFilters.endDate && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded">
                Hasta {formatDate(localFilters.endDate)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}