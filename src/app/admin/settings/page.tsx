'use client';

import { useState, useEffect } from 'react';

interface SiteSettings {
  siteTitle: string;
  favicon: string;
  lightLogo: string;
  darkLogo: string;
  maintenanceMode: boolean;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<SiteSettings>({
    siteTitle: 'NBA Props Analysis',
    favicon: '',
    lightLogo: '',
    darkLogo: '',
    maintenanceMode: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      // Load settings from localStorage
      const savedSettings = localStorage.getItem('admin_site_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      // Save to localStorage
      localStorage.setItem('admin_site_settings', JSON.stringify(settings));
      
      // Update document title
      document.title = settings.siteTitle;
      
      // Update favicon if provided
      if (settings.favicon) {
        const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        link.href = settings.favicon;
        document.getElementsByTagName('head')[0].appendChild(link);
      }

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (field: keyof SiteSettings, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setSettings(prev => ({ ...prev, [field]: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (field: keyof SiteSettings, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
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
          ⚙️ Site Settings
        </h1>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="space-y-6">
          {/* Site Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Site Title
            </label>
            <input
              type="text"
              value={settings.siteTitle}
              onChange={(e) => handleInputChange('siteTitle', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="NBA Props Analysis"
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              This will appear in the browser tab and page headers
            </p>
          </div>

          {/* Favicon Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Favicon
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="file"
                accept="image/*,.ico"
                onChange={(e) => handleFileUpload('favicon', e)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {settings.favicon && (
                <img src={settings.favicon} alt="Favicon" className="w-8 h-8" />
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Upload a .ico or image file for the browser tab icon
            </p>
          </div>

          {/* Light Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Light Mode Logo
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload('lightLogo', e)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {settings.lightLogo && (
                <img src={settings.lightLogo} alt="Light Logo" className="h-12 max-w-32 object-contain" />
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Logo displayed in light mode (SVG recommended)
            </p>
          </div>

          {/* Dark Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Dark Mode Logo
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload('darkLogo', e)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {settings.darkLogo && (
                <img src={settings.darkLogo} alt="Dark Logo" className="h-12 max-w-32 object-contain bg-gray-800 p-2 rounded" />
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Logo displayed in dark mode (SVG recommended)
            </p>
          </div>

          {/* Maintenance Mode */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => handleInputChange('maintenanceMode', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Enable Maintenance Mode
              </span>
            </label>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              When enabled, non-admin users will see a maintenance page
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </div>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">👀 Preview</h2>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center space-x-4">
            {settings.lightLogo && (
              <img src={settings.lightLogo} alt="Logo Preview" className="h-8 max-w-24 object-contain" />
            )}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {settings.siteTitle}
            </h3>
            {settings.favicon && (
              <img src={settings.favicon} alt="Favicon Preview" className="w-4 h-4" />
            )}
          </div>
          {settings.maintenanceMode && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">🚧 Maintenance mode is enabled</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}