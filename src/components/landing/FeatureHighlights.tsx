'use client';

import { useEffect, useRef } from 'react';
import { RefreshCw, Users, Globe, BarChart2, Filter, Check } from 'lucide-react';

export default function FeatureHighlights() {
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in');
          }
        });
      },
      { threshold: 0.1 }
    );

    const features = featuresRef.current?.querySelectorAll('.feature');
    if (features) {
      features.forEach((feature) => observer.observe(feature));
    }

    return () => {
      if (features) {
        features.forEach((feature) => observer.unobserve(feature));
      }
    };
  }, []);

  const features = [
    {
      icon: <RefreshCw className="w-6 h-6" />,
      title: 'Datos automáticos',
      description: 'Actualizaciones diarias de estadísticas y props de jugadores sin intervención manual.'
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Estadísticas de jugadores',
      description: 'Accede a datos detallados de todos los jugadores activos de la NBA.'
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: 'Interfaz en español',
      description: 'Plataforma completamente en español para fans hispanohablantes.'
    },
    {
      icon: <BarChart2 className="w-6 h-6" />,
      title: 'Gráficos interactivos',
      description: 'Visualiza tendencias y patrones con gráficos dinámicos y fáciles de entender.'
    },
    {
      icon: <Filter className="w-6 h-6" />,
      title: 'Filtros personalizados',
      description: 'Personaliza tu análisis con filtros avanzados para obtener insights precisos.'
    },
    {
      icon: <Check className="w-6 h-6" />,
      title: 'Análisis de props',
      description: 'Evalúa líneas de props con tasas de acierto históricas y recomendaciones.'
    }
  ];

  return (
    <section className="py-20 bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          Características principales
        </h2>

        <div 
          ref={featuresRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <div 
              key={index}
              className={`feature opacity-0 p-6 rounded-xl bg-gray-800 border border-gray-700 shadow-lg transition-all duration-500 hover:border-blue-500/30 hover:shadow-blue-500/10 delay-${index * 50}`}
            >
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-600/20 text-blue-500 mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}