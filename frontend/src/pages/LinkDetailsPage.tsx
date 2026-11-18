import React from 'react';
import { useParams, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MousePointerClick,
  Calendar,
  Zap,
  Share2,
  AlertCircle,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { GlassCard, Button, Skeleton } from '@/components/ui';
import { LinkHeader } from '@/components/stats/LinkHeader';
import { AnimatedCounter } from '@/components/stats/AnimatedCounter';
import { ClicksAreaChart } from '@/components/stats/ClicksAreaChart';
import { ReferrersList } from '@/components/stats/ReferrersList';
import { apiClient, getFriendlyErrorMessage } from '@/api/client';

export const LinkDetailsPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();

  const {
    data: link,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['linkDetails', code],
    queryFn: () => apiClient.getUrlDetails(code || ''),
    enabled: Boolean(code),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 space-y-6 animate-pulse">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !link) {
    const friendly = getFriendlyErrorMessage(error);
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <GlassCard level="raised" className="text-center p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-4">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">{friendly.title}</h2>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            {friendly.description || `The short code "/${code}" could not be located in our system.`}
          </p>

          {friendly.traceId && (
            <p className="mt-2 text-[11px] font-mono text-slate-500">
              Trace ID: {friendly.traceId}
            </p>
          )}

          <div className="mt-6">
            <NavLink to="/dashboard">
              <Button variant="secondary" size="md" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Return to Dashboard
              </Button>
            </NavLink>
          </div>
        </GlassCard>
      </div>
    );
  }

  const createdDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(link.createdAt));

  const averageDaily = Math.round(link.clicks / 7);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 space-y-8">
      {/* Quick-Copy Header */}
      <LinkHeader link={link} />

      {/* Primary Analytics KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Animated Click Total Card */}
        <GlassCard level="raised" className="p-6 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-medium">Total Lifetime Clicks</span>
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-accent-cyan">
              <MousePointerClick className="h-4 w-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <AnimatedCounter
              value={link.clicks}
              className="text-4xl sm:text-5xl font-extrabold text-slate-100"
            />
            <span className="text-xs text-accent-cyan font-mono">redirects</span>
          </div>

          <p className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-accent-violet" />
            High-precision asynchronous click tracking
          </p>
        </GlassCard>

        {/* Velocity / Average Clicks */}
        <GlassCard level="base" className="p-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-medium">7-Day Velocity</span>
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-accent-indigo">
              <Zap className="h-4 w-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-100">
              ~{averageDaily.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-mono">clicks / day</span>
          </div>

          <p className="mt-3 text-[11px] text-slate-400">
            Computed over active 7-day rolling window
          </p>
        </GlassCard>

        {/* Link Creation Metadata */}
        <GlassCard level="base" className="p-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-medium">Created On</span>
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-emerald-400">
              <Calendar className="h-4 w-4" />
            </div>
          </div>

          <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-100">
            {createdDate}
          </div>

          <p className="mt-3 text-[11px] text-slate-400">
            Snowflake 64-bit ID generation epoch
          </p>
        </GlassCard>
      </div>

      {/* Graceful "No Clicks Yet" Alert Banner */}
      {link.clicks === 0 && (
        <GlassCard level="raised" className="p-6 border-accent-indigo/30 bg-accent-indigo/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-accent-indigo/20 text-accent-cyan mt-0.5">
                <Share2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Ready for incoming traffic
                </h3>
                <p className="mt-1 text-xs text-slate-300 max-w-xl leading-relaxed">
                  This short URL is active and healthy in the distributed cache. Share it to start
                  capturing sub-50ms redirect analytics and referral streams.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(link.shortUrl);
              }}
              className="shrink-0"
            >
              Copy &amp; Share
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Visual Analytics Grid: Clicks Chart + Referrers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ClicksAreaChart data={link.clicksByDay} totalClicks={link.clicks} />
        </div>
        <div className="lg:col-span-1">
          <ReferrersList referrers={link.referrers} totalClicks={link.clicks} />
        </div>
      </div>
    </div>
  );
};

export default LinkDetailsPage;
