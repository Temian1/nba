'use client';

import { useEffect, useRef } from 'react';
import { Star } from 'lucide-react';

interface Testimonial {
  name: string;
  role: string;
  content: string;
  rating: number;
}

export default function Testimonials() {
  const testimonialsRef = useRef<HTMLDivElement>(null);

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

    const testimonials = testimonialsRef.current?.querySelectorAll('.testimonial');
    if (testimonials) {
      testimonials.forEach((testimonial) => observer.observe(testimonial));
    }

    return () => {
      if (testimonials) {
        testimonials.forEach((testimonial) => observer.unobserve(testimonial));
      }
    };
  }, []);

  const testimonials: Testimonial[] = [
    {
      name: 'Carlos Rodríguez',
      role: 'Fan de los Lakers',
      content: 'Esta plataforma ha cambiado completamente mi forma de analizar las props. Los datos son precisos y las recomendaciones muy acertadas.',
      rating: 5
    },
    {
      name: 'María González',
      role: 'Analista deportiva',
      content: 'La mejor herramienta en español para analizar estadísticas de la NBA. Los filtros personalizados son extremadamente útiles.',
      rating: 5
    },
    {
      name: 'Javier Martínez',
      role: 'Fan de los Celtics',
      content: 'Interfaz intuitiva y datos actualizados diariamente. Me encanta poder ver las tendencias de los jugadores de forma tan clara.',
      rating: 4
    }
  ];

  return (
    <section className="py-20 bg-gray-950 text-gray-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          Lo que dicen nuestros usuarios
        </h2>

        <div 
          ref={testimonialsRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className={`testimonial opacity-0 p-6 rounded-xl bg-gray-900 border border-gray-800 shadow-lg transition-all duration-500 hover:border-blue-500/30 hover:shadow-blue-500/10 delay-${index * 100}`}
            >
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-5 h-5 ${i < testimonial.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'}`} 
                  />
                ))}
              </div>
              <p className="text-gray-300 mb-6 italic">
                "{testimonial.content}"
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                  {testimonial.name.charAt(0)}
                </div>
                <div className="ml-3">
                  <h4 className="font-semibold">{testimonial.name}</h4>
                  <p className="text-sm text-gray-400">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}