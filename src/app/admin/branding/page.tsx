'use client';

import { useState, useEffect } from 'react';

interface BrandingSettings {
  primaryColor: string;
  fontStack: string;
  customCSS: string;
}

const colorPresets = [
  { name: 'Blue', value: '#3B82F6', class: 'blue' },
  { name: 'Purple', value: '#8B5CF6', class: 'purple' },
  { name: 'Green', value: '#10B981', class: 'green' },
  { name: 'Red', value: '#EF4444', class: 'red' },
  { name: 'Orange', value: '#F97316', class: 'orange' },
  { name: 'Pink', value: '#EC4899', class: 'pink' },
  { name: 'Indigo', value: '#6366F1', class: 'indigo' },
  { name: 'Teal', value: '#14B8A6', class: 'teal' },
];

const fontOptions = [
  { name: 'Inter (Default)', value: 'Inter, system-ui, sans-serif' },
  { name: 'Roboto', value: 'Roboto, sans-serif' },
  { name: 'Open Sans', value: '"Open Sans", sans-serif' },
  { name: 'Lato', value: 'Lato, sans-serif' },
  { name: 'Poppins', value: 'Poppins, sans-serif' },
  { name: 'Montserrat', value: 'Montserrat, sans-serif' },
  { name: 'Source Sans Pro', value: '"Source Sans Pro", sans-serif' },
  { name: 'System Default', value: 'system-ui, -apple-system, sans-serif' },
];

export default function AdminBranding() {
  const [settings, setSettings] = useState<BrandingSettings>({
    primaryColor: '#3B82F6',
    fontStack: 'Inter, system-ui, sans-serif',
    customCSS: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem('admin_branding_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading branding settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      localStorage.setItem('admin_branding_settings', JSON.stringify(settings));
      setMessage({ type: 'success', text: 'Branding settings saved successfully!' });
    } catch (error) {
      console.error('Error saving branding settings:', error);
      setMessage({ type: 'error', text: 'Failed to save branding settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const applyPreview = () => {
    if (isPreviewMode) {
      // Remove preview styles
      const existingStyle = document.getElementById('admin-preview-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
      setIsPreviewMode(false);
    } else {
      // Apply preview styles
      const style = document.createElement('style');
      style.id = 'admin-preview-styles';
      style.textContent = `
        :root {
          --primary-color: ${settings.primaryColor};
        }
        * {
          font-family: ${settings.fontStack} !important;
        }
        .bg-blue-600, .bg-blue-500 {
          background-color: ${settings.primaryColor} !important;
        }
        .text-blue-600, .text-blue-500 {
          color: ${settings.primaryColor} !important;
        }
        .border-blue-600, .border-blue-500 {
          border-color: ${settings.primaryColor} !important;
        }
        .hover\\:bg-blue-700:hover {
          background-color: ${adjustColor(settings.primaryColor, -20)} !important;
        }
        ${settings.customCSS}
      `;
      document.head.appendChild(style);
      setIsPreviewMode(true);
    }
  };

  const adjustColor = (color: string, amount: number) => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * amount);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  };

  const handleInputChange = (field: keyof BrandingSettings, value: string) => {
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
          🎨 Branding Settings
        </h1>
        <button
          onClick={applyPreview}
          className={`px-4 py-2 rounded-lg transition-colors ${
            isPreviewMode
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isPreviewMode ? '❌ Stop Preview' : '👀 Preview Changes'}
        </button>
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

      {isPreviewMode && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg">
          <p className="font-medium">👀 Preview Mode Active</p>
          <p className="text-sm">You're seeing how the changes will look. Click "Stop Preview" to return to normal.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Primary Color */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">🎨 Primary Color</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Custom Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                  className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.primaryColor}
                  onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="#3B82F6"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Color Presets
              </label>
              <div className="grid grid-cols-4 gap-3">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handleInputChange('primaryColor', preset.value)}
                    className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                      settings.primaryColor === preset.value
                        ? 'border-gray-900 dark:border-white'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full mb-2"
                      style={{ backgroundColor: preset.value }}
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Font Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">🔤 Typography</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Font Family
              </label>
              <select
                value={settings.fontStack}
                onChange={(e) => handleInputChange('fontStack', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {fontOptions.map((font) => (
                  <option key={font.name} value={font.value}>
                    {font.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Font Preview
              </label>
              <div 
                className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700"
                style={{ fontFamily: settings.fontStack }}
              >
                <h3 className="text-lg font-bold mb-2">Sample Heading</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This is how your text will look with the selected font family. 
                  The quick brown fox jumps over the lazy dog.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">💻 Custom CSS</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional CSS Rules
            </label>
            <textarea
              value={settings.customCSS}
              onChange={(e) => handleInputChange('customCSS', e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
              placeholder={`/* Add your custom CSS here */
.custom-button {
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  color: white;
  font-weight: bold;
}`}
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Add custom CSS rules to further customize the appearance. Use with caution.
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
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
            'Save Branding Settings'
          )}
        </button>
      </div>
    </div>
  );
}