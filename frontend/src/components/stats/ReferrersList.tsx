import React from 'react';
import {
  Compass,
  Globe,
  Share2,
  Twitter,
  Github,
  Search,
  ExternalLink,
} from 'lucide-react';
import { GlassCard } from '@/components/ui';
import type { ReferrerStat } from '@/api/client';

interface ReferrersListProps {
  referrers: ReferrerStat[];
  totalClicks: number;
}

const getReferrerIcon = (source: string) => {
  const lower = source.toLowerCase();
  if (lower.includes('twitter') || lower.includes('x')) {
    return <Twitter className="h-4 w-4 text-sky-400" />;
  }
  if (lower.includes('github')) {
    return <Github className="h-4 w-4 text-slate-200" />;
  }
  if (lower.includes('linkedin')) {
    return <Share2 className="h-4 w-4 text-blue-400" />;
  }
  if (lower.includes('google') || lower.includes('search')) {
    return <Search className="h-4 w-4 text-emerald-400" />;
  }
  if (lower.includes('direct') || lower.includes('none')) {
    return <Compass className="h-4 w-4 text-accent-coral" />;
  }
  return <Globe className="h-4 w-4 text-accent-indigo" />;
};

export const ReferrersList: React.FC<ReferrersListProps> = ({ referrers, totalClicks }) => {
  const hasReferrers = totalClicks > 0 && referrers.length > 0;

  return (
    <GlassCard level="raised" className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-accent-indigo" />
            <h3 className="text-sm font-semibold text-slate-100 dark:text-slate-100 [data-theme=light]:text-slate-900">
              Top Referrers
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-400 [data-theme=light]:text-slate-600">
            Traffic distribution by referring platform
          </p>
        </div>
      </div>

      {!hasReferrers ? (
        <div className="py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-slate-400 mb-3">
            <ExternalLink className="h-5 w-5 text-slate-400" />
          </div>
          <h4 className="text-xs font-semibold text-slate-300">No referrer data yet</h4>
          <p className="mt-1 text-xs text-slate-400 max-w-xs mx-auto">
            Referral sources like search engines and social apps will be categorized here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {referrers.map((item) => (
            <div key={item.source} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                    {getReferrerIcon(item.source)}
                  </span>
                  <span className="font-medium text-slate-200">{item.source}</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-slate-300 font-semibold">
                    {item.clicks.toLocaleString()}
                  </span>
                  <span className="text-slate-400 text-[11px] w-9 text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>

              {/* Accent Gradient Progress Bar */}
              <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent-indigo via-accent-violet to-accent-cyan transition-all duration-700 ease-out"
                  style={{ width: `${Math.max(item.percentage, 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
};
