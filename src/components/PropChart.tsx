'use client';

import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { GameOutcome } from '@/lib/services/prop-analytics';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface PropChartProps {
  gameOutcomes: GameOutcome[];
  propLine: number;
  propType: string;
}

export default function PropChart({ gameOutcomes, propLine, propType }: PropChartProps) {
  const chartRef = useRef<ChartJS>(null);

  // Sort games by date (most recent first)
  const sortedOutcomes = [...gameOutcomes].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  ).slice(0, 20); // Show last 20 games

  const labels = sortedOutcomes.map(outcome => {
    const date = new Date(outcome.date);
    const opponent = outcome.opponent;
    const homeAway = outcome.isHome ? 'vs' : '@';
    return `${format(date, 'dd/MM', { locale: es })} ${homeAway} ${opponent}`;
  }).reverse(); // Reverse to show chronologically

  const actualValues = sortedOutcomes.map(outcome => outcome.actualValue).reverse();
  const results = sortedOutcomes.map(outcome => outcome.result).reverse();

  const data = {
    labels,
    datasets: [
      {
        type: 'line' as const,
        label: `Línea de Apuesta (${propLine})`,
        data: new Array(labels.length).fill(propLine),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 3,
        borderDash: [8, 4],
        pointRadius: 0,
        tension: 0
      },
      {
        type: 'bar' as const,
        label: `Rendimiento Real (${getPropTypeLabel(propType)})`,
        data: actualValues,
        backgroundColor: results.map(result => 
          result === 'over' 
            ? 'rgba(34, 197, 94, 0.8)' // Green for over
            : 'rgba(239, 68, 68, 0.8)'  // Red for under
        ),
        borderColor: results.map(result => 
          result === 'over' 
            ? 'rgb(34, 197, 94)' 
            : 'rgb(239, 68, 68)'
        ),
        borderWidth: 1
      }
    ]
  };

  const options: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      title: {
        display: true,
        text: `Últimos ${sortedOutcomes.length} Partidos - ${getPropTypeLabel(propType)}`,
        font: {
          size: 16,
          weight: 'bold'
        },
        color: '#374151'
      },
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          color: '#374151'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#374151',
        borderWidth: 1,
        callbacks: {
          title: function(context) {
            const index = context[0].dataIndex;
            const outcome = sortedOutcomes[sortedOutcomes.length - 1 - index];
            const date = new Date(outcome.date);
            const homeAway = outcome.isHome ? 'Local vs' : 'Visitante @';
            return `${format(date, 'dd/MM/yyyy', { locale: es })} - ${homeAway} ${outcome.opponent}`;
          },
          label: function(context) {
            const index = context.dataIndex;
            const outcome = sortedOutcomes[sortedOutcomes.length - 1 - index];
            
            if (context.dataset.type === 'line') {
              return `Línea: ${propLine}`;
            } else {
              const result = outcome.result === 'over' ? 'OVER ✅' : 'UNDER ❌';
              const minutes = outcome.minutes ? ` (${outcome.minutes} min)` : '';
              return `${getPropTypeLabel(propType)}: ${outcome.actualValue} - ${result}${minutes}`;
            }
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Partidos (Cronológico)',
          color: '#374151',
          font: {
            weight: 'bold'
          }
        },
        ticks: {
          color: '#6B7280',
          maxRotation: 45,
          minRotation: 45
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.1)'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: getPropTypeLabel(propType),
          color: '#374151',
          font: {
            weight: 'bold'
          }
        },
        ticks: {
          color: '#6B7280'
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.1)'
        },
        beginAtZero: true
      }
    }
  };

  function getPropTypeLabel(propType: string): string {
    const labels: Record<string, string> = {
      'pts': 'Puntos',
      'reb': 'Rebotes',
      'ast': 'Asistencias',
      'stl': 'Robos',
      'blk': 'Bloqueos',
      'turnover': 'Pérdidas',
      'pra': 'Puntos + Rebotes + Asistencias',
      'pr': 'Puntos + Rebotes',
      'pa': 'Puntos + Asistencias',
      'ra': 'Rebotes + Asistencias',
      'fg3m': 'Triples Anotados',
      'fgm': 'Tiros de Campo Anotados',
      'ftm': 'Tiros Libres Anotados'
    };
    return labels[propType] || propType;
  }

  if (gameOutcomes.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p>No hay datos disponibles para mostrar el gráfico</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-96">
      <Chart
        ref={chartRef}
        type="bar"
        data={data}
        options={options}
      />
    </div>
  );
}