'use client';

import { useEffect, useRef } from 'react';
import { Target, BarChart3, Search } from 'lucide-react';

export default function HowItWorks() {
  const stepsRef = useRef<HTMLDivElement>(null);

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

    const steps = stepsRef.current?.querySelectorAll('.step');
    if (steps) {
      steps.forEach((step) => observer.observe(step));
    }

    return () => {
      if (steps) {
        steps.forEach((step) => observer.unobserve(step));
      }
    };
  }, []);

  return (
    <section className="py-20 bg-gray-950 text-gray-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          Cómo funciona
        </h2>

        <div 
          ref={stepsRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12"
        >
          {/* Step 1 */}
          <div className="step opacity-0 flex flex-col items-center text-center p-6 rounded-xl bg-gray-900 border border-gray-800 shadow-lg transition-all duration-500 hover:border-blue-500/30 hover:shadow-blue-500/10">
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-blue-600/20 text-blue-500 mb-6">
              <Target className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-4">Paso 1: Selecciona cualquier jugador</h3>
            <p className="text-gray-400">
              Busca entre todos los jugadores activos de la NBA y selecciona el que te interese analizar.
            </p>
          </div>

          {/* Step 2 */}
          <div className="step opacity-0 flex flex-col items-center text-center p-6 rounded-xl bg-gray-900 border border-gray-800 shadow-lg transition-all duration-500 hover:border-blue-500/30 hover:shadow-blue-500/10 delay-100">
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-blue-600/20 text-blue-500 mb-6">
              <BarChart3 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-4">Paso 2: Aplica filtros avanzados</h3>
            <p className="text-gray-400">
              Filtra por partidos en casa/visita, minutos jugados, últimos enfrentamientos y más para un análisis preciso.
            </p>
          </div>

          {/* Step 3 */}
          <div className="step opacity-0 flex flex-col items-center text-center p-6 rounded-xl bg-gray-900 border border-gray-800 shadow-lg transition-all duration-500 hover:border-blue-500/30 hover:shadow-blue-500/10 delay-200">
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-blue-600/20 text-blue-500 mb-6">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-4">Paso 3: Ve estadísticas detalladas</h3>
            <p className="text-gray-400">
              Analiza estadísticas, tasas de aciertos y gráficos de barras para tomar decisiones informadas.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}