'use client';

import { useState, useEffect, useMemo } from 'react';

interface Team {
  id: number;
  abbreviation: string;
  city: string;
  conference: string;
  division: string;
  full_name: string;
  name: string;
}

export default function AdminTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConference, setSelectedConference] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      const response = await fetch('/api/teams', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTeams(data.data || []);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const conferences = useMemo(() => {
    return [...new Set(teams.map(team => team.conference))].sort();
  }, [teams]);

  const divisions = useMemo(() => {
    const filteredTeams = selectedConference 
      ? teams.filter(team => team.conference === selectedConference)
      : teams;
    return [...new Set(filteredTeams.map(team => team.division))].sort();
  }, [teams, selectedConference]);

  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      const matchesSearch = searchTerm === '' || 
        team.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.abbreviation.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesConference = selectedConference === '' || team.conference === selectedConference;
      const matchesDivision = selectedDivision === '' || team.division === selectedDivision;
      
      return matchesSearch && matchesConference && matchesDivision;
    });
  }, [teams, searchTerm, selectedConference, selectedDivision]);

  const groupedTeams = useMemo(() => {
    const grouped: { [key: string]: Team[] } = {};
    
    filteredTeams.forEach(team => {
      const key = `${team.conference} - ${team.division}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(team);
    });
    
    return grouped;
  }, [filteredTeams]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedConference('');
    setSelectedDivision('');
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
          🏀 Teams Management
        </h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {filteredTeams.length} of {teams.length} teams
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Teams
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Search by name, city, or abbreviation..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Conference
            </label>
            <select
              value={selectedConference}
              onChange={(e) => {
                setSelectedConference(e.target.value);
                setSelectedDivision(''); // Reset division when conference changes
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Conferences</option>
              {conferences.map(conference => (
                <option key={conference} value={conference}>{conference}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Division
            </label>
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Divisions</option>
              {divisions.map(division => (
                <option key={division} value={division}>{division}</option>
              ))}
            </select>
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

      {/* Teams Grid */}
      {Object.keys(groupedTeams).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedTeams).map(([divisionKey, divisionTeams]) => (
            <div key={divisionKey} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {divisionKey}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {divisionTeams.length} team{divisionTeams.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
                {divisionTeams.map((team) => (
                  <div
                    key={team.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {team.abbreviation}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {team.full_name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {team.city} {team.name}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                        {team.conference}
                      </span>
                      <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                        {team.division}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            <span className="text-4xl mb-4 block">🔍</span>
            <p className="text-lg font-medium">No teams found</p>
            <p className="text-sm">Try adjusting your search criteria</p>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {filteredTeams.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            📊 Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {filteredTeams.length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Teams</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {conferences.filter(conf => filteredTeams.some(team => team.conference === conf)).length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Conferences</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {Object.keys(groupedTeams).length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Divisions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {Math.round(filteredTeams.length / Object.keys(groupedTeams).length * 10) / 10}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Avg per Division</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}