'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import Dashboard from '@/components/Dashboard';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [showSetupInstructions, setShowSetupInstructions] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const handleSyncData = async (type: string) => {
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(`✅ ${data.message}`);
      } else {
        alert(`❌ Error: ${data.error || 'Error desconocido'}`);
      }
    } catch (error) {
      alert(`❌ Error de conexión: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation Header */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2">
                <span className="text-2xl">🏀</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  NBA Props
                </span>
              </Link>
              
              {/* Main Navigation Menu */}
              {user && (
                <div className="hidden md:flex items-center space-x-6">
                  <Link
                    href="/"
                    className="text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
                  >
                    📊 Dashboard
                  </Link>
                  <Link
                    href="/teams"
                    className="text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
                  >
                    🏀 Equipos
                  </Link>
                  <Link
                    href="/players"
                    className="text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
                  >
                    👤 Jugadores
                  </Link>
                  <div className="relative group">
                    <button className="text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors flex items-center space-x-1">
                      <span>🔧 Herramientas</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="py-1">
                        <a
                          href="/api/health"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          🏥 Estado del Sistema
                        </a>
                        <button
                          onClick={() => window.open('/api/players?limit=10', '_blank')}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          👥 API Jugadores
                        </button>
                        <button
                          onClick={() => window.open('/api/teams', '_blank')}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          🏀 API Equipos
                        </button>
                        <button
                          onClick={() => window.open('/api/analyze-prop', '_blank')}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          📈 Tipos de Props
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="relative group">
                    <button className="text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors flex items-center space-x-1">
                      <span>⚙️ Admin</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="py-1">
                        <button
                          onClick={() => handleSyncData('teams')}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          🔄 Sincronizar Equipos
                        </button>
                        <button
                          onClick={() => handleSyncData('players')}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          👥 Sincronizar Jugadores
                        </button>
                        <button
                          onClick={() => handleSyncData('games')}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          🏀 Sincronizar Juegos
                        </button>
                        <button
                          onClick={() => window.open('/api/test-data', '_blank')}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          🧪 Datos de Prueba
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Hola, {user.name || user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-red-600 hover:text-red-800 dark:text-red-400"
                  >
                    Cerrar sesión
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link
                    href="/login"
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/register"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
                  >
                    Registrarse
                  </Link>
                </div>
              )}
              
              {/* Mobile menu button */}
              {user && (
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isMobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        {user && isMobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 space-y-3">
              <Link
                href="/"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                📊 Dashboard
              </Link>
              <Link
                href="/teams"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                🏀 Equipos
              </Link>
              <Link
                href="/players"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                👤 Jugadores
              </Link>
              
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">🔧 Herramientas</div>
                <div className="pl-4 space-y-2">
                  <a
                    href="/api/health"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                  >
                    🏥 Estado del Sistema
                  </a>
                  <button
                    onClick={() => { window.open('/api/players?limit=10', '_blank'); setIsMobileMenuOpen(false); }}
                    className="block w-full text-left text-sm text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                  >
                    👥 API Jugadores
                  </button>
                  <button
                    onClick={() => { window.open('/api/teams', '_blank'); setIsMobileMenuOpen(false); }}
                    className="block w-full text-left text-sm text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                  >
                    🏀 API Equipos
                  </button>
                  <button
                    onClick={() => { window.open('/api/analyze-prop', '_blank'); setIsMobileMenuOpen(false); }}
                    className="block w-full text-left text-sm text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                  >
                    📈 Tipos de Props
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">⚙️ Admin</div>
                <div className="pl-4 space-y-2">
                  <button
                    onClick={() => { handleSyncData('teams'); setIsMobileMenuOpen(false); }}
                    className="block w-full text-left text-sm text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                  >
                    🔄 Sincronizar Equipos
                  </button>
                  <button
                    onClick={() => { handleSyncData('players'); setIsMobileMenuOpen(false); }}
                    className="block w-full text-left text-sm text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                  >
                    👥 Sincronizar Jugadores
                  </button>
                  <button
                    onClick={() => { handleSyncData('games'); setIsMobileMenuOpen(false); }}
                    className="block w-full text-left text-sm text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                  >
                    🏀 Sincronizar Juegos
                  </button>
                  <button
                    onClick={() => { window.open('/api/test-data', '_blank'); setIsMobileMenuOpen(false); }}
                    className="block w-full text-left text-sm text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                  >
                    🧪 Datos de Prueba
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🏀 Análisis de Props NBA
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Plataforma de análisis de apuestas de jugadores NBA
          </p>
        </header>
        
        {/* Database Setup Instructions */}
        {showSetupInstructions && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-yellow-800 mb-4">
              🔧 Configuración de Base de Datos Requerida
            </h3>
            <div className="text-sm text-yellow-700 space-y-2">
              <p>Para usar la aplicación, necesitas configurar PostgreSQL:</p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Instala PostgreSQL en tu sistema</li>
                <li>Ejecuta: <code className="bg-yellow-100 px-2 py-1 rounded">node setup-database.js</code></li>
                <li>Ejecuta: <code className="bg-yellow-100 px-2 py-1 rounded">npm run db:generate</code></li>
                <li>Ejecuta: <code className="bg-yellow-100 px-2 py-1 rounded">npm run db:migrate</code></li>
                <li>Reinicia el servidor de desarrollo</li>
              </ol>
            </div>
            <button
              onClick={() => setShowSetupInstructions(false)}
              className="mt-4 text-yellow-600 hover:text-yellow-800 text-sm"
            >
              Ocultar instrucciones
            </button>
          </div>
        )}
        
        <Suspense fallback={<LoadingSpinner />}>
          <DatabaseErrorBoundary onShowSetup={() => setShowSetupInstructions(true)}>
            <Dashboard />
          </DatabaseErrorBoundary>
        </Suspense>
      </div>
    </div>
  );
}

// Error boundary component to catch database errors
function DatabaseErrorBoundary({ children, onShowSetup }: { children: React.ReactNode, onShowSetup: () => void }) {
  return (
    <div>
      {children}
    </div>
  );
}
