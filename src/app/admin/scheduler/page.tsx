'use client';

import { useState, useEffect } from 'react';

interface SyncJob {
  id: string;
  type: 'teams' | 'players' | 'games' | 'stats' | 'full';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  duration?: number;
  recordsProcessed?: number;
  errorMessage?: string;
  triggeredBy: 'manual' | 'scheduled' | 'auto';
}

interface SyncStats {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  averageDuration: number;
  lastSync: string;
}

export default function AdminScheduler() {
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [syncStats, setSyncStats] = useState<SyncStats>({
    totalJobs: 0,
    successfulJobs: 0,
    failedJobs: 0,
    averageDuration: 0,
    lastSync: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [runningSyncs, setRunningSyncs] = useState<Set<string>>(new Set());
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncInterval, setSyncInterval] = useState(60); // minutes
  const [lastAutoSync, setLastAutoSync] = useState<string>('');

  useEffect(() => {
    loadSyncJobs();
    loadSyncSettings();
    
    // Poll for running jobs every 5 seconds
    const interval = setInterval(() => {
      if (runningSyncs.size > 0) {
        loadSyncJobs();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [runningSyncs]);

  const loadSyncJobs = () => {
    try {
      const savedJobs = localStorage.getItem('admin_sync_jobs');
      if (savedJobs) {
        const jobs = JSON.parse(savedJobs);
        setSyncJobs(jobs);
        calculateSyncStats(jobs);
      }
    } catch (error) {
      console.error('Error loading sync jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSyncSettings = () => {
    try {
      const settings = localStorage.getItem('admin_sync_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setAutoSyncEnabled(parsed.autoSyncEnabled ?? true);
        setSyncInterval(parsed.syncInterval ?? 60);
        setLastAutoSync(parsed.lastAutoSync ?? '');
      }
    } catch (error) {
      console.error('Error loading sync settings:', error);
    }
  };

  const saveSyncSettings = () => {
    const settings = {
      autoSyncEnabled,
      syncInterval,
      lastAutoSync
    };
    localStorage.setItem('admin_sync_settings', JSON.stringify(settings));
  };

  const calculateSyncStats = (jobs: SyncJob[]) => {
    const totalJobs = jobs.length;
    const successfulJobs = jobs.filter(job => job.status === 'completed').length;
    const failedJobs = jobs.filter(job => job.status === 'failed').length;
    const completedJobs = jobs.filter(job => job.duration);
    const averageDuration = completedJobs.length > 0 
      ? completedJobs.reduce((sum, job) => sum + (job.duration || 0), 0) / completedJobs.length
      : 0;
    const lastSync = jobs.length > 0 ? jobs[0].startTime : '';

    setSyncStats({
      totalJobs,
      successfulJobs,
      failedJobs,
      averageDuration,
      lastSync
    });
  };

  const createSyncJob = (type: SyncJob['type'], triggeredBy: SyncJob['triggeredBy'] = 'manual'): SyncJob => {
    return {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      status: 'pending',
      startTime: new Date().toISOString(),
      triggeredBy
    };
  };

  const updateSyncJob = (jobId: string, updates: Partial<SyncJob>) => {
    setSyncJobs(prev => {
      const updated = prev.map(job => 
        job.id === jobId ? { ...job, ...updates } : job
      );
      localStorage.setItem('admin_sync_jobs', JSON.stringify(updated));
      return updated;
    });
  };

  const triggerSync = async (type: SyncJob['type']) => {
    const job = createSyncJob(type);
    
    // Add job to list
    setSyncJobs(prev => {
      const updated = [job, ...prev].slice(0, 100); // Keep only last 100 jobs
      localStorage.setItem('admin_sync_jobs', JSON.stringify(updated));
      return updated;
    });
    
    setRunningSyncs(prev => new Set([...prev, job.id]));
    
    try {
      // Update job status to running
      updateSyncJob(job.id, { status: 'running' });
      
      // Make API call to sync endpoint
      const endpoint = type === 'full' ? '/api/sync/all' : `/api/sync/${type}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      const endTime = new Date().toISOString();
      const duration = new Date(endTime).getTime() - new Date(job.startTime).getTime();

      if (response.ok) {
        updateSyncJob(job.id, {
          status: 'completed',
          endTime,
          duration,
          recordsProcessed: result.recordsProcessed || 0
        });
      } else {
        updateSyncJob(job.id, {
          status: 'failed',
          endTime,
          duration,
          errorMessage: result.error || 'Unknown error occurred'
        });
      }
    } catch (error) {
      const endTime = new Date().toISOString();
      const duration = new Date(endTime).getTime() - new Date(job.startTime).getTime();
      
      updateSyncJob(job.id, {
        status: 'failed',
        endTime,
        duration,
        errorMessage: error instanceof Error ? error.message : 'Network error'
      });
    } finally {
      setRunningSyncs(prev => {
        const updated = new Set(prev);
        updated.delete(job.id);
        return updated;
      });
    }
  };

  const retryFailedJob = (job: SyncJob) => {
    triggerSync(job.type);
  };

  const clearSyncHistory = () => {
    if (confirm('Are you sure you want to clear all sync history? This cannot be undone.')) {
      setSyncJobs([]);
      localStorage.removeItem('admin_sync_jobs');
    }
  };

  const exportSyncLogs = () => {
    const csvContent = [
      'ID,Type,Status,Start Time,End Time,Duration (ms),Records Processed,Error Message,Triggered By',
      ...syncJobs.map(job => [
        job.id,
        job.type,
        job.status,
        job.startTime,
        job.endTime || '',
        job.duration || '',
        job.recordsProcessed || '',
        job.errorMessage || '',
        job.triggeredBy
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sync-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  const getStatusColor = (status: SyncJob['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getTypeIcon = (type: SyncJob['type']) => {
    switch (type) {
      case 'teams': return '🏀';
      case 'players': return '👤';
      case 'games': return '🏆';
      case 'stats': return '📊';
      case 'full': return '🔄';
      default: return '📋';
    }
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
          ⏰ Sync Scheduler
        </h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportSyncLogs}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Export Logs
          </button>
          <button
            onClick={clearSyncHistory}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Clear History
          </button>
        </div>
      </div>

      {/* Sync Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {syncStats.totalJobs}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Jobs</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {syncStats.successfulJobs}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Successful</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {syncStats.failedJobs}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Failed</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {formatDuration(syncStats.averageDuration)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Avg Duration</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {syncStats.lastSync ? formatDateTime(syncStats.lastSync).split(' ')[1] : 'Never'}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Last Sync</div>
        </div>
      </div>

      {/* Manual Sync Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          🚀 Manual Sync Controls
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <button
            onClick={() => triggerSync('teams')}
            disabled={runningSyncs.size > 0}
            className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-2xl mb-2">🏀</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Sync Teams</span>
          </button>
          
          <button
            onClick={() => triggerSync('players')}
            disabled={runningSyncs.size > 0}
            className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-2xl mb-2">👤</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Sync Players</span>
          </button>
          
          <button
            onClick={() => triggerSync('games')}
            disabled={runningSyncs.size > 0}
            className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-2xl mb-2">🏆</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Sync Games</span>
          </button>
          
          <button
            onClick={() => triggerSync('stats')}
            disabled={runningSyncs.size > 0}
            className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-2xl mb-2">📊</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Sync Stats</span>
          </button>
          
          <button
            onClick={() => triggerSync('full')}
            disabled={runningSyncs.size > 0}
            className="flex flex-col items-center p-4 border-2 border-dashed border-blue-500 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-2xl mb-2">🔄</span>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Full Sync</span>
          </button>
        </div>
        
        {runningSyncs.size > 0 && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-800 dark:text-blue-200">
                {runningSyncs.size} sync job(s) running...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Auto Sync Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          ⚙️ Auto Sync Settings
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoSyncEnabled"
              checked={autoSyncEnabled}
              onChange={(e) => {
                setAutoSyncEnabled(e.target.checked);
                saveSyncSettings();
              }}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="autoSyncEnabled" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Enable Auto Sync
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sync Interval (minutes)
            </label>
            <input
              type="number"
              min="5"
              max="1440"
              value={syncInterval}
              onChange={(e) => {
                setSyncInterval(parseInt(e.target.value));
                saveSyncSettings();
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Last Auto Sync
            </label>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-white">
              {lastAutoSync ? formatDateTime(lastAutoSync) : 'Never'}
            </div>
          </div>
        </div>
      </div>

      {/* Sync History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            📋 Sync History
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Start Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Records
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Triggered By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {syncJobs.slice(0, 20).map((job) => (
                <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">{getTypeIcon(job.type)}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {job.type}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                      {job.status === 'running' && (
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-current mr-1"></div>
                      )}
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatDateTime(job.startTime)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {job.duration ? formatDuration(job.duration) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {job.recordsProcessed || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      job.triggeredBy === 'manual' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : job.triggeredBy === 'scheduled'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {job.triggeredBy}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {job.status === 'failed' && (
                      <button
                        onClick={() => retryFailedJob(job)}
                        disabled={runningSyncs.size > 0}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Retry
                      </button>
                    )}
                    {job.errorMessage && (
                      <div className="mt-1 text-xs text-red-600 dark:text-red-400 max-w-xs truncate" title={job.errorMessage}>
                        {job.errorMessage}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {syncJobs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400">
              <span className="text-4xl mb-4 block">📋</span>
              <p className="text-lg font-medium">No sync jobs yet</p>
              <p className="text-sm">Trigger a manual sync to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}