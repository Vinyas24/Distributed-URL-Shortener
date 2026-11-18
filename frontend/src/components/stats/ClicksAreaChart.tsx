import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { MousePointerClick, TrendingUp, BarChart2 } from 'lucide-react';
import { GlassCard } from '@/components/ui';
import type { DailyClicks } from '@/api/client';

interface ClicksAreaChartProps {
  data: DailyClicks[];
  totalClicks: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

const CustomGlassTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="glass-raised p-2.5 rounded-xl text-xs shadow-glass-raised border border-white/20">
      <div className="font-medium text-slate-300 mb-1">{label}</div>
      <div className="flex items-center gap-1.5 text-accent-cyan font-mono font-semibold">
        <MousePointerClick className="h-3.5 w-3.5" />
        <span>{payload[0].value.toLocaleString()} clicks</span>
      </div>
    </div>
  );
};

export const ClicksAreaChart: React.FC<ClicksAreaChartProps> = ({ data, totalClicks }) => {
  const hasClicks = totalClicks > 0 && data.some((d) => d.clicks > 0);

  return (
    <GlassCard level="raised" className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent-violet" />
            <h3 className="text-sm font-semibold text-slate-100 dark:text-slate-100 [data-theme=light]:text-slate-900">
              Clicks Over Time
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-400 [data-theme=light]:text-slate-600">
            Daily click analytics for the past 7 days
          </p>
        </div>

        {hasClicks && (
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-accent-cyan">
            <span className="flex h-2 w-2 rounded-full bg-accent-cyan animate-pulse" />
            Real-time telemetry
          </div>
        )}
      </div>

      {!hasClicks ? (
        <div className="py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-slate-400 mb-3">
            <BarChart2 className="h-6 w-6 text-slate-400" />
          </div>
          <h4 className="text-sm font-semibold text-slate-200">No clicks recorded yet</h4>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Traffic trends will appear here as soon as visitors begin clicking your shortened link.
          </p>
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {/* Custom Calm Glass Accent Gradient */}
                <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.45} />
                  <stop offset="60%" stopColor="#6366F1" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366F1" />
                  <stop offset="50%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(255, 255, 255, 0.08)"
              />

              <XAxis
                dataKey="date"
                stroke="rgba(148, 163, 184, 0.5)"
                tick={{ fontSize: 11, fill: 'rgba(148, 163, 184, 0.8)' }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
              />

              <YAxis
                stroke="rgba(148, 163, 184, 0.5)"
                tick={{ fontSize: 11, fill: 'rgba(148, 163, 184, 0.8)' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />

              <Tooltip content={<CustomGlassTooltip />} />

              <Area
                type="monotone"
                dataKey="clicks"
                stroke="url(#strokeGradient)"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#clicksGradient)"
                isAnimationActive={true}
                animationDuration={900}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </GlassCard>
  );
};
