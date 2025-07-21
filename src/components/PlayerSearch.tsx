'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Search, User } from 'lucide-react';

interface Player {
  id: number;
  firstName: string;
  lastName: string;
  position?: string;
  teamName?: string;
  teamAbbreviation?: string;
}

interface PlayerSearchProps {
  onPlayerSelect: (player: Player) => void;
  onError?: (error: string) => void;
}

export default function PlayerSearch({ onPlayerSelect, onError }: PlayerSearchProps) {
  const t = useTranslations();
  const [searchTerm, setSearchTerm] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load players on component mount
  useEffect(() => {
    loadPlayers();
  }, []);

  // Filter players based on search term
  useEffect(() => {
    if (searchTerm.length >= 2) {
      const filtered = players.filter(player => {
        const fullName = `${player.firstName} ${player.lastName}`.toLowerCase();
        const teamName = player.teamName?.toLowerCase() || '';
        const teamAbbr = player.teamAbbreviation?.toLowerCase() || '';
        const search = searchTerm.toLowerCase();
        
        return fullName.includes(search) || 
               teamName.includes(search) || 
               teamAbbr.includes(search);
      });
      setFilteredPlayers(filtered.slice(0, 10)); // Limit to 10 results
      setIsOpen(true);
      setSelectedIndex(-1);
    } else {
      setFilteredPlayers([]);
      setIsOpen(false);
    }
  }, [searchTerm, players]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadPlayers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/players');
      if (response.ok) {
        const data = await response.json();
        setPlayers(data.players || data);
      } else {
        const errorText = response.statusText || 'Error interno del servidor';
        console.error('Error loading players:', errorText);
        onError?.(errorText);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error de conexión';
      console.error('Error loading players:', error);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredPlayers.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredPlayers.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredPlayers.length) {
          handlePlayerSelect(filteredPlayers[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handlePlayerSelect = (player: Player) => {
    setSearchTerm(`${player.firstName} ${player.lastName}`);
    setIsOpen(false);
    setSelectedIndex(-1);
    onPlayerSelect(player);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={searchRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('player.search')}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          disabled={isLoading}
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && filteredPlayers.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredPlayers.map((player, index) => (
            <div
              key={player.id}
              onClick={() => handlePlayerSelect(player)}
              className={`px-4 py-3 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-b-0 ${
                index === selectedIndex
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {player.firstName} {player.lastName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {player.position && `${player.position} • `}
                    {player.teamName} ({player.teamAbbreviation})
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {isOpen && searchTerm.length >= 2 && filteredPlayers.length === 0 && !isLoading && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
          <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
            {t('player.noResults')}
          </div>
        </div>
      )}
    </div>
  );
}