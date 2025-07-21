'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '@/components/LoadingSpinner';
import { RefreshCw, Users, MapPin, Trophy } from 'lucide-react';

interface Team {
  id: number;
  abbreviation: string;
  city: string;
  conference: string;
  division: string;
  fullName: string;
  name: string;
}

interface TeamsResponse {
  teams: Team[];
  pagination: {
    total: string;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConference, setSelectedConference] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchTeams = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      
      const response = await fetch('/api/teams?limit=50');
      if (!response.ok) {
        throw new Error('Error al cargar los equipos');
      }
      
      const data: TeamsResponse = await response.json();
      setTeams(data.teams || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchTeams(true);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleManualRefresh = () => {
    fetchTeams(true);
  };

  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         team.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         team.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesConference = selectedConference === 'all' || 
                             team.conference.trim().toLowerCase() === selectedConference.toLowerCase();
    
    return matchesSearch && matchesConference;
  });

  const activeTeams = filteredTeams.filter(team => team.conference.trim() !== '');
  const historicalTeams = filteredTeams.filter(team => team.conference.trim() === '');

  const getConferenceBadgeColor = (conference: string) => {
    const conf = conference.trim().toLowerCase();
    if (conf === 'east') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (conf === 'west') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getDivisionColor = (division: string) => {
    const colors = {
      'atlantic': 'bg-indigo-50 text-indigo-700',
      'central': 'bg-green-50 text-green-700',
      'southeast': 'bg-purple-50 text-purple-700',
      'northwest': 'bg-orange-50 text-orange-700',
      'pacific': 'bg-pink-50 text-pink-700',
      'southwest': 'bg-yellow-50 text-yellow-700'
    };
    return colors[division.toLowerCase() as keyof typeof colors] || 'bg-gray-50 text-gray-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                <Users className="w-10 h-10 text-blue-600" />
                🏀 Equipos NBA
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Explora todos los equipos de la NBA con información detallada
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="autoRefresh" className="text-sm text-gray-600 dark:text-gray-300">
                  Auto-actualizar
                </label>
              </div>
              
              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Actualizando...' : 'Actualizar'}
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar equipos por nombre, ciudad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          <select
            value={selectedConference}
            onChange={(e) => setSelectedConference(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            <option value="all">Todas las Conferencias</option>
            <option value="east">Conferencia Este</option>
            <option value="west">Conferencia Oeste</option>
          </select>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            ❌ {error}
          </div>
        )}

        {/* Active Teams */}
        {activeTeams.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Equipos Activos ({activeTeams.length})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {activeTeams.map((team) => (
                <Card key={team.id} className="hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform">
                          {team.abbreviation}
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
                            {team.name}
                          </CardTitle>
                          <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {team.city}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Conferencia:</span>
                        <Badge className={getConferenceBadgeColor(team.conference)}>
                          {team.conference.trim()}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">División:</span>
                        <Badge variant="outline" className={getDivisionColor(team.division)}>
                          {team.division}
                        </Badge>
                      </div>
                      
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                          {team.fullName}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Historical Teams */}
        {historicalTeams.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-6 h-6 text-gray-500" />
              Equipos Históricos ({historicalTeams.length})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {historicalTeams.map((team) => (
                <Card key={team.id} className="opacity-75 hover:opacity-100 transition-all duration-300 hover:scale-105">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {team.abbreviation}
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-gray-700 dark:text-gray-300">
                          {team.name}
                        </CardTitle>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {team.fullName}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
                      Equipo Histórico
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {filteredTeams.length === 0 && !loading && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">
              No se encontraron equipos
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Intenta ajustar tus filtros de búsqueda
            </p>
          </div>
        )}
      </div>
    </div>
  );
}