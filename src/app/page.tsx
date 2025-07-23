'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import FeatureHighlights from '@/components/landing/FeatureHighlights';
import Testimonials from '@/components/landing/Testimonials';
import Footer from '@/components/landing/Footer';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('auth_token');
    
    // If user is logged in, redirect to dashboard
    if (userData && token) {
      router.push('/admin/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Head>
        <title>NBA Props - Análisis avanzado de props de la NBA en español</title>
        <meta name="description" content="Análisis avanzado de props de la NBA en español, actualizado automáticamente cada día." />
        <meta property="og:title" content="NBA Props - Análisis de props NBA" />
        <meta property="og:description" content="Análisis avanzado de props de la NBA en español, actualizado automáticamente cada día." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/og-image.jpg" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <Suspense fallback={<LoadingSpinner />}>
          <Hero />
          <HowItWorks />
          <FeatureHighlights />
          <Testimonials />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
