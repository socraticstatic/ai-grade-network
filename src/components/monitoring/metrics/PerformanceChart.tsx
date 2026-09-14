import { useEffect, useState } from 'react';

interface PerformanceChartProps {
  data: number[];
  labels: string[];
  color?: string;
}

export function PerformanceChart({ data, labels, color = '#0057b8' }: PerformanceChartProps) {
  const [chartLoaded, setChartLoaded] = useState(false);
  const [chartComponent, setChartComponent] = useState<any>(null);

  // Dynamically import Chart.js and create Line component
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

        // Register necessary components
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
              backgroundColor: `${color}15`,
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

        setChartComponent(
          <Line data={chartData} options={options} />
        );
        
        setChartLoaded(true);
      } catch (error) {
        console.error("Failed to load chart components:", error);
      }
    };
    
    loadChart();
  }, [data, labels, color]);

  if (!chartLoaded) {
    return <div className="w-full h-full flex items-center justify-center">
      <div className="bg-fw-neutral animate-pulse w-full h-full rounded-lg"></div>
    </div>;
  }

  return chartComponent;
}