'use client';

import { useState, useEffect } from 'react';

interface PropConfig {
  stat: string;
  label: string;
  defaultMultiplier: number;
  hitRateThreshold: number;
  roundingRule: 'none' | 'half' | 'whole';
  overUnderLogic: boolean;
  enabled: boolean;
}

const DEFAULT_PROP_CONFIGS: PropConfig[] = [
  {
    stat: 'pts',
    label: 'Points',
    defaultMultiplier: 1.05,
    hitRateThreshold: 56.5,
    roundingRule: 'half',
    overUnderLogic: true,
    enabled: true
  },
  {
    stat: 'reb',
    label: 'Rebounds',
    defaultMultiplier: 1.03,
    hitRateThreshold: 55.0,
    roundingRule: 'half',
    overUnderLogic: true,
    enabled: true
  },
  {
    stat: 'ast',
    label: 'Assists',
    defaultMultiplier: 1.02,
    hitRateThreshold: 54.5,
    roundingRule: 'half',
    overUnderLogic: true,
    enabled: true
  },
  {
    stat: 'fg3m',
    label: '3-Pointers Made',
    defaultMultiplier: 1.08,
    hitRateThreshold: 58.0,
    roundingRule: 'half',
    overUnderLogic: true,
    enabled: true
  },
  {
    stat: 'stl',
    label: 'Steals',
    defaultMultiplier: 1.10,
    hitRateThreshold: 52.0,
    roundingRule: 'half',
    overUnderLogic: true,
    enabled: true
  },
  {
    stat: 'blk',
    label: 'Blocks',
    defaultMultiplier: 1.15,
    hitRateThreshold: 50.0,
    roundingRule: 'half',
    overUnderLogic: true,
    enabled: true
  },
  {
    stat: 'pra',
    label: 'Points + Rebounds + Assists',
    defaultMultiplier: 1.04,
    hitRateThreshold: 57.0,
    roundingRule: 'whole',
    overUnderLogic: true,
    enabled: true
  }
];

export default function AdminProps() {
  const [propConfigs, setPropConfigs] = useState<PropConfig[]>(DEFAULT_PROP_CONFIGS);
  const [globalSettings, setGlobalSettings] = useState({
    defaultHitRateThreshold: 55.0,
    defaultMultiplier: 1.05,
    enableOverUnderHighlight: true,
    enablePropAnalysis: true,
    minGamesForAnalysis: 10,
    maxDaysBack: 30
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    loadPropConfigs();
  }, []);

  const loadPropConfigs = () => {
    try {
      const savedConfigs = localStorage.getItem('admin_prop_configs');
      const savedGlobalSettings = localStorage.getItem('admin_global_prop_settings');
      
      if (savedConfigs) {
        setPropConfigs(JSON.parse(savedConfigs));
      }
      
      if (savedGlobalSettings) {
        setGlobalSettings(JSON.parse(savedGlobalSettings));
      }
    } catch (error) {
      console.error('Error loading prop configs:', error);
    }
  };

  const savePropConfigs = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('admin_prop_configs', JSON.stringify(propConfigs));
      localStorage.setItem('admin_global_prop_settings', JSON.stringify(globalSettings));
      
      setHasChanges(false);
      setSaveMessage('✅ Prop configurations saved successfully!');
      
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving prop configs:', error);
      setSaveMessage('❌ Error saving configurations');
    } finally {
      setIsSaving(false);
    }
  };

  const updatePropConfig = (index: number, field: keyof PropConfig, value: any) => {
    const updated = [...propConfigs];
    updated[index] = { ...updated[index], [field]: value };
    setPropConfigs(updated);
    setHasChanges(true);
  };

  const updateGlobalSetting = (field: string, value: any) => {
    setGlobalSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all prop configurations to defaults? This cannot be undone.')) {
      setPropConfigs(DEFAULT_PROP_CONFIGS);
      setGlobalSettings({
        defaultHitRateThreshold: 55.0,
        defaultMultiplier: 1.05,
        enableOverUnderHighlight: true,
        enablePropAnalysis: true,
        minGamesForAnalysis: 10,
        maxDaysBack: 30
      });
      setHasChanges(true);
    }
  };

  const addCustomProp = () => {
    const newProp: PropConfig = {
      stat: 'custom',
      label: 'Custom Stat',
      defaultMultiplier: 1.05,
      hitRateThreshold: 55.0,
      roundingRule: 'half',
      overUnderLogic: true,
      enabled: true
    };
    setPropConfigs([...propConfigs, newProp]);
    setHasChanges(true);
  };

  const removePropConfig = (index: number) => {
    if (confirm('Are you sure you want to remove this prop configuration?')) {
      const updated = propConfigs.filter((_, i) => i !== index);
      setPropConfigs(updated);
      setHasChanges(true);
    }
  };

  const calculateSimulatedLine = (seasonAvg: number, multiplier: number, roundingRule: string): number => {
    const line = seasonAvg * multiplier;
    
    switch (roundingRule) {
      case 'whole':
        return Math.round(line);
      case 'half':
        return Math.round(line * 2) / 2;
      default:
        return Math.round(line * 10) / 10;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          🎯 Props Management
        </h1>
        <div className="flex items-center space-x-3">
          {saveMessage && (
            <span className="text-sm text-green-600 dark:text-green-400">
              {saveMessage}
            </span>
          )}
          {hasChanges && (
            <button
              onClick={savePropConfigs}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      {/* Global Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          🌐 Global Settings
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Hit Rate Threshold (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={globalSettings.defaultHitRateThreshold}
              onChange={(e) => updateGlobalSetting('defaultHitRateThreshold', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Multiplier
            </label>
            <input
              type="number"
              step="0.01"
              min="0.5"
              max="2.0"
              value={globalSettings.defaultMultiplier}
              onChange={(e) => updateGlobalSetting('defaultMultiplier', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Min Games for Analysis
            </label>
            <input
              type="number"
              min="1"
              max="82"
              value={globalSettings.minGamesForAnalysis}
              onChange={(e) => updateGlobalSetting('minGamesForAnalysis', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Days Back
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={globalSettings.maxDaysBack}
              onChange={(e) => updateGlobalSetting('maxDaysBack', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="enableOverUnder"
              checked={globalSettings.enableOverUnderHighlight}
              onChange={(e) => updateGlobalSetting('enableOverUnderHighlight', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="enableOverUnder" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Enable Over/Under Highlight
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="enablePropAnalysis"
              checked={globalSettings.enablePropAnalysis}
              onChange={(e) => updateGlobalSetting('enablePropAnalysis', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="enablePropAnalysis" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Enable Prop Analysis
            </label>
          </div>
        </div>
      </div>

      {/* Prop Configurations */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            📊 Prop Configurations
          </h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={addCustomProp}
              className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
            >
              + Add Custom
            </button>
            <button
              onClick={resetToDefaults}
              className="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
            >
              Reset to Defaults
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Stat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Multiplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Hit Rate (%)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Rounding
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Over/Under
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Example
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {propConfigs.map((config, index) => (
                <tr key={index} className={`${!config.enabled ? 'opacity-50' : ''} hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <input
                        type="text"
                        value={config.label}
                        onChange={(e) => updatePropConfig(index, 'label', e.target.value)}
                        className="text-sm font-medium text-gray-900 dark:text-white bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1"
                      />
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                        {config.stat}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      step="0.01"
                      min="0.5"
                      max="2.0"
                      value={config.defaultMultiplier}
                      onChange={(e) => updatePropConfig(index, 'defaultMultiplier', parseFloat(e.target.value))}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={config.hitRateThreshold}
                      onChange={(e) => updatePropConfig(index, 'hitRateThreshold', parseFloat(e.target.value))}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={config.roundingRule}
                      onChange={(e) => updatePropConfig(index, 'roundingRule', e.target.value)}
                      className="text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="none">0.1</option>
                      <option value="half">0.5</option>
                      <option value="whole">1.0</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={config.overUnderLogic}
                      onChange={(e) => updatePropConfig(index, 'overUnderLogic', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => updatePropConfig(index, 'enabled', !config.enabled)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        config.enabled
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                    >
                      {config.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="space-y-1">
                      <div>Avg: 25.0 → Line: {calculateSimulatedLine(25.0, config.defaultMultiplier, config.roundingRule)}</div>
                      <div>Avg: 8.5 → Line: {calculateSimulatedLine(8.5, config.defaultMultiplier, config.roundingRule)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => removePropConfig(index)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          🔍 Configuration Preview
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {propConfigs.filter(config => config.enabled).map((config, index) => (
            <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                {config.label}
              </h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div>Multiplier: {config.defaultMultiplier}x</div>
                <div>Hit Rate: {config.hitRateThreshold}%</div>
                <div>Rounding: {config.roundingRule === 'none' ? '0.1' : config.roundingRule === 'half' ? '0.5' : '1.0'}</div>
                <div>Over/Under: {config.overUnderLogic ? '✅' : '❌'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
          💡 Configuration Help
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-200">
          <div>
            <h3 className="font-medium mb-2">Multiplier</h3>
            <p>Applied to season average to create simulated lines. Higher values create more challenging props.</p>
          </div>
          <div>
            <h3 className="font-medium mb-2">Hit Rate Threshold</h3>
            <p>Minimum percentage needed to highlight a prop as favorable. Lower values are more selective.</p>
          </div>
          <div>
            <h3 className="font-medium mb-2">Rounding Rules</h3>
            <p>How to round calculated lines: 0.1 (precise), 0.5 (half-point), 1.0 (whole numbers).</p>
          </div>
          <div>
            <h3 className="font-medium mb-2">Over/Under Logic</h3>
            <p>Enable to show both over and under recommendations based on hit rates.</p>
          </div>
        </div>
      </div>
    </div>
  );
}