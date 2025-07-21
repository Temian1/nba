'use client';

import { useState, useEffect } from 'react';

interface NavLink {
  id: string;
  label: string;
  href: string;
  icon?: string;
  isExternal?: boolean;
  order: number;
}

interface SocialIcon {
  id: string;
  name: string;
  url: string;
  svgContent: string;
  order: number;
}

interface UIConfig {
  header: {
    desktop: {
      showLogo: boolean;
      logoPosition: 'left' | 'center' | 'right';
      navLinks: NavLink[];
      showSearch: boolean;
      showUserMenu: boolean;
    };
    mobile: {
      showLogo: boolean;
      navLinks: NavLink[];
      showSearch: boolean;
      showUserMenu: boolean;
      hamburgerStyle: 'default' | 'minimal' | 'animated';
    };
  };
  footer: {
    desktop: {
      showLogo: boolean;
      columns: {
        id: string;
        title: string;
        links: NavLink[];
        order: number;
      }[];
      socialIcons: SocialIcon[];
      showCopyright: boolean;
      copyrightText: string;
    };
    mobile: {
      showLogo: boolean;
      accordionStyle: boolean;
      socialIcons: SocialIcon[];
      showCopyright: boolean;
      copyrightText: string;
    };
  };
}

const defaultUIConfig: UIConfig = {
  header: {
    desktop: {
      showLogo: true,
      logoPosition: 'left',
      navLinks: [
        { id: '1', label: 'Home', href: '/', order: 1 },
        { id: '2', label: 'Players', href: '/players', order: 2 },
        { id: '3', label: 'Teams', href: '/teams', order: 3 },
        { id: '4', label: 'Games', href: '/games', order: 4 },
        { id: '5', label: 'Stats', href: '/stats', order: 5 }
      ],
      showSearch: true,
      showUserMenu: true
    },
    mobile: {
      showLogo: true,
      navLinks: [
        { id: '1', label: 'Home', href: '/', order: 1 },
        { id: '2', label: 'Players', href: '/players', order: 2 },
        { id: '3', label: 'Teams', href: '/teams', order: 3 },
        { id: '4', label: 'Games', href: '/games', order: 4 },
        { id: '5', label: 'Stats', href: '/stats', order: 5 }
      ],
      showSearch: false,
      showUserMenu: true,
      hamburgerStyle: 'default'
    }
  },
  footer: {
    desktop: {
      showLogo: true,
      columns: [
        {
          id: '1',
          title: 'Navigation',
          links: [
            { id: '1', label: 'Home', href: '/', order: 1 },
            { id: '2', label: 'Players', href: '/players', order: 2 },
            { id: '3', label: 'Teams', href: '/teams', order: 3 }
          ],
          order: 1
        },
        {
          id: '2',
          title: 'Resources',
          links: [
            { id: '4', label: 'API Docs', href: '/api-docs', order: 1 },
            { id: '5', label: 'Support', href: '/support', order: 2 }
          ],
          order: 2
        }
      ],
      socialIcons: [],
      showCopyright: true,
      copyrightText: '© 2024 NBA Prop Analysis. All rights reserved.'
    },
    mobile: {
      showLogo: true,
      accordionStyle: true,
      socialIcons: [],
      showCopyright: true,
      copyrightText: '© 2024 NBA Prop Analysis. All rights reserved.'
    }
  }
};

export default function AdminUIEditor() {
  const [uiConfig, setUIConfig] = useState<UIConfig>(defaultUIConfig);
  const [activeTab, setActiveTab] = useState<'header' | 'footer'>('header');
  const [activeDevice, setActiveDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [editingNavLink, setEditingNavLink] = useState<NavLink | null>(null);
  const [editingSocialIcon, setEditingSocialIcon] = useState<SocialIcon | null>(null);
  const [newSocialIconSVG, setNewSocialIconSVG] = useState('');

  useEffect(() => {
    loadUIConfig();
  }, []);

  const loadUIConfig = () => {
    try {
      const savedConfig = localStorage.getItem('admin_ui_config');
      if (savedConfig) {
        setUIConfig(JSON.parse(savedConfig));
      }
    } catch (error) {
      console.error('Error loading UI config:', error);
    }
  };

  const saveUIConfig = (config: UIConfig) => {
    try {
      localStorage.setItem('admin_ui_config', JSON.stringify(config));
      setUIConfig(config);
    } catch (error) {
      console.error('Error saving UI config:', error);
    }
  };

  const addNavLink = (section: 'header' | 'footer', device: 'desktop' | 'mobile', columnId?: string) => {
    const newLink: NavLink = {
      id: Date.now().toString(),
      label: 'New Link',
      href: '/',
      order: 999
    };
    setEditingNavLink(newLink);
  };

  const saveNavLink = (link: NavLink, section: 'header' | 'footer', device: 'desktop' | 'mobile', columnId?: string) => {
    const newConfig = { ...uiConfig };
    
    if (section === 'header') {
      const existingIndex = newConfig.header[device].navLinks.findIndex(l => l.id === link.id);
      if (existingIndex >= 0) {
        newConfig.header[device].navLinks[existingIndex] = link;
      } else {
        newConfig.header[device].navLinks.push(link);
      }
      newConfig.header[device].navLinks.sort((a, b) => a.order - b.order);
    } else if (section === 'footer' && columnId) {
      const column = newConfig.footer.desktop.columns.find(c => c.id === columnId);
      if (column) {
        const existingIndex = column.links.findIndex(l => l.id === link.id);
        if (existingIndex >= 0) {
          column.links[existingIndex] = link;
        } else {
          column.links.push(link);
        }
        column.links.sort((a, b) => a.order - b.order);
      }
    }
    
    saveUIConfig(newConfig);
    setEditingNavLink(null);
  };

  const deleteNavLink = (linkId: string, section: 'header' | 'footer', device: 'desktop' | 'mobile', columnId?: string) => {
    const newConfig = { ...uiConfig };
    
    if (section === 'header') {
      newConfig.header[device].navLinks = newConfig.header[device].navLinks.filter(l => l.id !== linkId);
    } else if (section === 'footer' && columnId) {
      const column = newConfig.footer.desktop.columns.find(c => c.id === columnId);
      if (column) {
        column.links = column.links.filter(l => l.id !== linkId);
      }
    }
    
    saveUIConfig(newConfig);
  };

  const addSocialIcon = () => {
    const newIcon: SocialIcon = {
      id: Date.now().toString(),
      name: 'New Social',
      url: 'https://example.com',
      svgContent: '',
      order: 999
    };
    setEditingSocialIcon(newIcon);
    setNewSocialIconSVG('');
  };

  const saveSocialIcon = (icon: SocialIcon) => {
    const newConfig = { ...uiConfig };
    
    const existingDesktopIndex = newConfig.footer.desktop.socialIcons.findIndex(i => i.id === icon.id);
    if (existingDesktopIndex >= 0) {
      newConfig.footer.desktop.socialIcons[existingDesktopIndex] = icon;
    } else {
      newConfig.footer.desktop.socialIcons.push(icon);
    }
    
    const existingMobileIndex = newConfig.footer.mobile.socialIcons.findIndex(i => i.id === icon.id);
    if (existingMobileIndex >= 0) {
      newConfig.footer.mobile.socialIcons[existingMobileIndex] = icon;
    } else {
      newConfig.footer.mobile.socialIcons.push(icon);
    }
    
    newConfig.footer.desktop.socialIcons.sort((a, b) => a.order - b.order);
    newConfig.footer.mobile.socialIcons.sort((a, b) => a.order - b.order);
    
    saveUIConfig(newConfig);
    setEditingSocialIcon(null);
    setNewSocialIconSVG('');
  };

  const deleteSocialIcon = (iconId: string) => {
    const newConfig = { ...uiConfig };
    newConfig.footer.desktop.socialIcons = newConfig.footer.desktop.socialIcons.filter(i => i.id !== iconId);
    newConfig.footer.mobile.socialIcons = newConfig.footer.mobile.socialIcons.filter(i => i.id !== iconId);
    saveUIConfig(newConfig);
  };

  const updateConfig = (path: string, value: any) => {
    const newConfig = { ...uiConfig };
    const keys = path.split('.');
    let current: any = newConfig;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    saveUIConfig(newConfig);
  };

  const exportConfig = () => {
    const dataStr = JSON.stringify(uiConfig, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ui-config.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target?.result as string);
          saveUIConfig(config);
        } catch (error) {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    }
  };

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset to default configuration? This cannot be undone.')) {
      saveUIConfig(defaultUIConfig);
    }
  };

  const previewConfig = () => {
    // In a real implementation, this would apply the config to the actual site
    setIsPreviewMode(!isPreviewMode);
    alert(isPreviewMode ? 'Preview mode disabled' : 'Preview mode enabled (simulated)');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          🎨 UI Editor
        </h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={previewConfig}
            className={`px-4 py-2 rounded-md transition-colors ${
              isPreviewMode
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isPreviewMode ? '✓ Preview Active' : '👁️ Preview Changes'}
          </button>
          <button
            onClick={exportConfig}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            📤 Export
          </button>
          <label className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors cursor-pointer">
            📥 Import
            <input
              type="file"
              accept=".json"
              onChange={importConfig}
              className="hidden"
            />
          </label>
          <button
            onClick={resetToDefaults}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            🔄 Reset
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('header')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'header'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              📱 Header
            </button>
            <button
              onClick={() => setActiveTab('footer')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'footer'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              🦶 Footer
            </button>
          </nav>
        </div>

        {/* Device Toggle */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Device:</span>
            <div className="flex rounded-md shadow-sm">
              <button
                onClick={() => setActiveDevice('desktop')}
                className={`px-4 py-2 text-sm font-medium rounded-l-md border transition-colors ${
                  activeDevice === 'desktop'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                🖥️ Desktop
              </button>
              <button
                onClick={() => setActiveDevice('mobile')}
                className={`px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b transition-colors ${
                  activeDevice === 'mobile'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                📱 Mobile
              </button>
            </div>
          </div>
        </div>

        {/* Header Configuration */}
        {activeTab === 'header' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Logo Settings</h3>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showLogo"
                    checked={uiConfig.header[activeDevice].showLogo}
                    onChange={(e) => updateConfig(`header.${activeDevice}.showLogo`, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="showLogo" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Show Logo
                  </label>
                </div>

                {activeDevice === 'desktop' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Logo Position
                    </label>
                    <select
                      value={uiConfig.header.desktop.logoPosition}
                      onChange={(e) => updateConfig('header.desktop.logoPosition', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Navigation Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Navigation Settings</h3>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showSearch"
                    checked={uiConfig.header[activeDevice].showSearch}
                    onChange={(e) => updateConfig(`header.${activeDevice}.showSearch`, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="showSearch" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Show Search
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showUserMenu"
                    checked={uiConfig.header[activeDevice].showUserMenu}
                    onChange={(e) => updateConfig(`header.${activeDevice}.showUserMenu`, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="showUserMenu" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Show User Menu
                  </label>
                </div>

                {activeDevice === 'mobile' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Hamburger Style
                    </label>
                    <select
                      value={uiConfig.header.mobile.hamburgerStyle}
                      onChange={(e) => updateConfig('header.mobile.hamburgerStyle', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="default">Default</option>
                      <option value="minimal">Minimal</option>
                      <option value="animated">Animated</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Links */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Navigation Links</h3>
                <button
                  onClick={() => addNavLink('header', activeDevice)}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  + Add Link
                </button>
              </div>
              
              <div className="space-y-2">
                {uiConfig.header[activeDevice].navLinks.map((link) => (
                  <div key={link.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <span className="text-sm font-medium text-gray-900 dark:text-white min-w-0 flex-1">
                      {link.label} → {link.href}
                    </span>
                    <button
                      onClick={() => setEditingNavLink(link)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteNavLink(link.id, 'header', activeDevice)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer Configuration */}
        {activeTab === 'footer' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* General Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">General Settings</h3>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="footerShowLogo"
                    checked={uiConfig.footer[activeDevice].showLogo}
                    onChange={(e) => updateConfig(`footer.${activeDevice}.showLogo`, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="footerShowLogo" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Show Logo
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showCopyright"
                    checked={uiConfig.footer[activeDevice].showCopyright}
                    onChange={(e) => updateConfig(`footer.${activeDevice}.showCopyright`, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="showCopyright" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Show Copyright
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Copyright Text
                  </label>
                  <input
                    type="text"
                    value={uiConfig.footer[activeDevice].copyrightText}
                    onChange={(e) => updateConfig(`footer.${activeDevice}.copyrightText`, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {activeDevice === 'mobile' && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="accordionStyle"
                      checked={uiConfig.footer.mobile.accordionStyle}
                      onChange={(e) => updateConfig('footer.mobile.accordionStyle', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="accordionStyle" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Accordion Style
                    </label>
                  </div>
                )}
              </div>

              {/* Social Icons */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Social Icons</h3>
                  <button
                    onClick={addSocialIcon}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    + Add Icon
                  </button>
                </div>
                
                <div className="space-y-2">
                  {uiConfig.footer[activeDevice].socialIcons.map((icon) => (
                    <div key={icon.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <div className="w-6 h-6" dangerouslySetInnerHTML={{ __html: icon.svgContent }} />
                      <span className="text-sm font-medium text-gray-900 dark:text-white min-w-0 flex-1">
                        {icon.name}
                      </span>
                      <button
                        onClick={() => setEditingSocialIcon(icon)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteSocialIcon(icon.id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Columns (Desktop only) */}
            {activeDevice === 'desktop' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Footer Columns</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {uiConfig.footer.desktop.columns.map((column) => (
                    <div key={column.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900 dark:text-white">{column.title}</h4>
                        <button
                          onClick={() => addNavLink('footer', 'desktop', column.id)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                        >
                          + Add Link
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        {column.links.map((link) => (
                          <div key={link.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700 dark:text-gray-300">
                              {link.label} → {link.href}
                            </span>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setEditingNavLink(link)}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteNavLink(link.id, 'footer', 'desktop', column.id)}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Nav Link Modal */}
      {editingNavLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {editingNavLink.id ? 'Edit Link' : 'Add Link'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Label
                </label>
                <input
                  type="text"
                  value={editingNavLink.label}
                  onChange={(e) => setEditingNavLink({ ...editingNavLink, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL
                </label>
                <input
                  type="text"
                  value={editingNavLink.href}
                  onChange={(e) => setEditingNavLink({ ...editingNavLink, href: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Order
                </label>
                <input
                  type="number"
                  value={editingNavLink.order}
                  onChange={(e) => setEditingNavLink({ ...editingNavLink, order: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isExternal"
                  checked={editingNavLink.isExternal || false}
                  onChange={(e) => setEditingNavLink({ ...editingNavLink, isExternal: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isExternal" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  External Link
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditingNavLink(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => saveNavLink(editingNavLink, activeTab, activeDevice)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Social Icon Modal */}
      {editingSocialIcon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {editingSocialIcon.id ? 'Edit Social Icon' : 'Add Social Icon'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={editingSocialIcon.name}
                  onChange={(e) => setEditingSocialIcon({ ...editingSocialIcon, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL
                </label>
                <input
                  type="url"
                  value={editingSocialIcon.url}
                  onChange={(e) => setEditingSocialIcon({ ...editingSocialIcon, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SVG Content
                </label>
                <textarea
                  value={newSocialIconSVG || editingSocialIcon.svgContent}
                  onChange={(e) => {
                    setNewSocialIconSVG(e.target.value);
                    setEditingSocialIcon({ ...editingSocialIcon, svgContent: e.target.value });
                  }}
                  rows={4}
                  placeholder="<svg>...</svg>"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Order
                </label>
                <input
                  type="number"
                  value={editingSocialIcon.order}
                  onChange={(e) => setEditingSocialIcon({ ...editingSocialIcon, order: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              {(newSocialIconSVG || editingSocialIcon.svgContent) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Preview
                  </label>
                  <div className="w-8 h-8 border border-gray-300 dark:border-gray-600 rounded p-1">
                    <div 
                      className="w-full h-full"
                      dangerouslySetInnerHTML={{ __html: newSocialIconSVG || editingSocialIcon.svgContent }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setEditingSocialIcon(null);
                  setNewSocialIconSVG('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => saveSocialIcon(editingSocialIcon)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}