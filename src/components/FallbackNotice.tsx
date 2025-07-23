/**
 * Fallback Notice Component
 * Displays a banner when the application is using localStorage fallback due to database errors
 */

'use client';

import React from 'react';
import { useFallback } from '@/lib/contexts/fallback-context';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface FallbackNoticeProps {
  className?: string;
}

export function FallbackNotice({ className = '' }: FallbackNoticeProps) {
  const { 
    showFallbackNotice, 
    fallbackState, 
    retryConnection, 
    dismissFallbackNotice 
  } = useFallback();
  const [isRetrying, setIsRetrying] = React.useState(false);

  if (!showFallbackNotice || !fallbackState.isFallbackMode) {
    return null;
  }

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retryConnection();
    } finally {
      setIsRetrying(false);
    }
  };

  const formatErrorTime = (timestamp: number | null) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className={`bg-yellow-50 border-l-4 border-yellow-400 p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <span className="font-medium">
                🚨 Modo offline: Mostrando datos en caché por error de conexión.
              </span>
              {fallbackState.lastDbErrorTime && (
                <span className="block text-xs mt-1 text-yellow-600">
                  Último error: {formatErrorTime(fallbackState.lastDbErrorTime)}
                  {fallbackState.retryCount > 1 && (
                    <span className="ml-2">
                      (Intentos: {fallbackState.retryCount})
                    </span>
                  )}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw 
              className={`h-3 w-3 mr-1 ${isRetrying ? 'animate-spin' : ''}`} 
              aria-hidden="true" 
            />
            {isRetrying ? 'Reintentando...' : 'Reintentar'}
          </button>
          <button
            onClick={dismissFallbackNotice}
            className="inline-flex items-center p-1 border border-transparent rounded text-yellow-400 hover:text-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            aria-label="Cerrar notificación"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      
      {/* Additional info for developers */}
      {process.env.NODE_ENV === 'development' && fallbackState.lastDbError && (
        <div className="mt-2 text-xs text-yellow-600 bg-yellow-100 p-2 rounded">
          <strong>Error técnico:</strong> {fallbackState.lastDbError}
        </div>
      )}
    </div>
  );
}

export default FallbackNotice;