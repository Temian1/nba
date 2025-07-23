'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black"></div>
      
      {/* Animated SVG wave */}
      <div className="absolute inset-0 opacity-20">
        <svg className="h-full w-full" viewBox="0 0 1440 800" xmlns="http://www.w3.org/2000/svg">
          <path 
            d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            fill="rgba(59, 130, 246, 0.2)"
            className="animate-wave-slow"
          ></path>
          <path 
            d="M0,320L48,309.3C96,299,192,277,288,266.7C384,256,480,256,576,240C672,224,768,192,864,197.3C960,203,1056,245,1152,261.3C1248,277,1344,267,1392,261.3L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            fill="rgba(59, 130, 246, 0.3)"
            className="animate-wave-fast"
          ></path>
        </svg>
      </div>

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center z-10">
        {/* Logo */}
        <div className="mb-6 flex items-center justify-center">
          <span className="text-5xl md:text-6xl">🏀</span>
          <h1 className="ml-3 text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
            NBA Props
          </h1>
        </div>

        {/* Tagline */}
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 max-w-3xl">
          Análisis avanzado de props de la NBA en español, actualizado automáticamente cada día.
        </h2>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Link 
            href="/login"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition transform hover:scale-105 active:scale-95 flex items-center justify-center"
          >
            Iniciar sesión
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
          <Link 
            href="/register"
            className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg border border-gray-700 transition transform hover:scale-105 active:scale-95 flex items-center justify-center"
          >
            Registrarse
          </Link>
        </div>
      </div>
    </section>
  );
}