/**
 * Fallback Context for NBA Props Analysis Platform
 * Manages global fallback state and provides UI notifications
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { dbFallbackService, FallbackState } from '../db/fallback-service';

interface FallbackContextType {
  fallbackState: FallbackState;
  refreshFallbackState: () => void;
  retryConnection: () => Promise<boolean>;
  dismissFallbackNotice: () => void;
  showFallbackNotice: boolean;
}

const FallbackContext = createContext<FallbackContextType | undefined>(undefined);

interface FallbackProviderProps {
  children: ReactNode;
}

export function FallbackProvider({ children }: FallbackProviderProps) {
  const [fallbackState, setFallbackState] = useState<FallbackState>({
    isFallbackMode: false,
    lastDbError: null,
    lastDbErrorTime: null,
    retryCount: 0
  });
  const [showFallbackNotice, setShowFallbackNotice] = useState(false);

  const refreshFallbackState = () => {
    const currentState = dbFallbackService.getFallbackState();
    setFallbackState(currentState);
    
    // Show notice if we're in fallback mode and it's not already shown
    if (currentState.isFallbackMode && !showFallbackNotice) {
      setShowFallbackNotice(true);
    }
  };

  const retryConnection = async (): Promise<boolean> => {
    const success = await dbFallbackService.forceRetryConnection();
    refreshFallbackState();
    
    if (success) {
      setShowFallbackNotice(false);
    }
    
    return success;
  };

  const dismissFallbackNotice = () => {
    setShowFallbackNotice(false);
  };

  // Check fallback state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      refreshFallbackState();
    }, 5000); // Check every 5 seconds

    // Initial check
    refreshFallbackState();

    return () => clearInterval(interval);
  }, [showFallbackNotice]);

  const value: FallbackContextType = {
    fallbackState,
    refreshFallbackState,
    retryConnection,
    dismissFallbackNotice,
    showFallbackNotice
  };

  return (
    <FallbackContext.Provider value={value}>
      {children}
    </FallbackContext.Provider>
  );
}

export function useFallback() {
  const context = useContext(FallbackContext);
  if (context === undefined) {
    throw new Error('useFallback must be used within a FallbackProvider');
  }
  return context;
}

// Hook to check if we're in fallback mode
export function useIsFallbackMode(): boolean {
  const { fallbackState } = useFallback();
  return fallbackState.isFallbackMode;
}

// Hook to get fallback error info
export function useFallbackError(): { error: string | null; time: number | null } {
  const { fallbackState } = useFallback();
  return {
    error: fallbackState.lastDbError,
    time: fallbackState.lastDbErrorTime
  };
}