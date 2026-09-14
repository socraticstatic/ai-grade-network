import { useEffect, useState } from 'react';

interface MobilePerformanceChartProps {
  data: number[];
  labels: string[];
  color: string;
}

export function MobilePerformanceChart({ data, labels, color }: MobilePerformanceChartProps) {
  const [isChartLoaded, setIsChartLoaded] = useState(false);
  const [chartComponent, setChartComponent] = useState<React.ReactNode>(null);

  useEffect(() => {
    const loadChart = async () => {
      try {
        const { Line } = await import('react-chartjs-2');
        const { 
          Chart,
          CategoryScale,
          LinearScale,
          PointElement,
          LineElement,
          Tooltip,
          Filler
        } = await import('chart.js');

        // Register only necessary components
        Chart.register(
          CategoryScale,
          LinearScale,
          PointElement,
          LineElement,
          Tooltip,
          Filler
        );

        const chartData = {
          labels,
          datasets: [
            {
              data,
              borderColor: color,
              backgroundColor: `${color}20`,
              fill: true,
              tension: 0.4,
              pointRadius: 0,
              borderWidth: 2,
            },
          ],
        };

        const options = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              enabled: true,
              mode: 'index' as const,
              intersect: false,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              titleColor: '#1f2937',
              bodyColor: '#1f2937',
              borderColor: '#e5e7eb',
              borderWidth: 1,
              padding: 8,
              bodyFont: {
                size: 12,
              },
              titleFont: {
                size: 12,
                weight: 'bold' as const,
              },
              callbacks: {
                label: function(context: any) {
                  return `Value: ${context.parsed.y}`;
                }
              }
            },
          },
          scales: {
            x: {
              display: false,
              grid: {
                display: false,
                drawBorder: false
              },
              border: {
                display: false
              }
            },
            y: {
              display: false,
              beginAtZero: true,
              grid: {
                display: false,
                drawBorder: false
              },
              border: {
                display: false
              }
            },
          },
          interaction: {
            intersect: false,
            mode: 'index' as const,
          },
          layout: {
            padding: 0
          },
          elements: {
            line: {
              tension: 0.4,
              borderWidth: 2
            },
            point: {
              radius: 0,
              hoverRadius: 3
            }
          }
        };

        setChartComponent(<Line data={chartData} options={options} />);
        setIsChartLoaded(true);
      } catch (error) {
        console.error('Error loading chart:', error);
      }
    };

    loadChart();
  }, [data, labels, color]);

  if (!isChartLoaded) {
    return (
      <div className="w-full h-full animate-pulse bg-fw-neutral rounded-md"></div>
    );
  }

  return <div className="w-full h-full">{chartComponent}</div>;
}