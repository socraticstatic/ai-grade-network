export type MetricFilter = 'all' | 'packetLoss' | 'latency' | 'jitter' | 'throughput';

interface Option {
  value: MetricFilter;
  label: string;
}

const OPTIONS: Option[] = [
  { value: 'all',        label: 'All Metrics'  },
  { value: 'packetLoss', label: 'Packet Loss'  },
  { value: 'latency',    label: 'Latency'      },
  { value: 'jitter',     label: 'Jitter'       },
  { value: 'throughput', label: 'Throughput'   },
];

interface MetricsSegmentedControlProps {
  value: MetricFilter;
  onChange: (value: MetricFilter) => void;
}

export function MetricsSegmentedControl({ value, onChange }: MetricsSegmentedControlProps) {
  return (
    <div
      role="group"
      aria-label="Metric filter"
      className="inline-flex items-center bg-fw-neutral rounded-xl p-1 gap-0.5"
    >
      {OPTIONS.map(option => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`
            px-3 py-1.5 rounded-lg text-figma-sm font-medium transition-all duration-150
            ${value === option.value
              ? 'bg-fw-base text-fw-heading shadow-sm'
              : 'text-fw-bodyLight hover:text-fw-body'
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
