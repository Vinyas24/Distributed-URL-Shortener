import React from 'react';
import { NavLink } from 'react-router-dom';
import { GlassCard, Button } from '@/components/ui';
import { BarChart3, Plus } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 dark:text-slate-100 [data-theme=light]:text-slate-900">
            Link Dashboard
          </h1>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-400 [data-theme=light]:text-slate-600">
            Manage your shortened URLs, inspect click analytics, and edit expiration.
          </p>
        </div>

        <NavLink to="/">
          <Button variant="primary" size="md" leftIcon={<Plus className="h-4 w-4" />}>
            Create New Link
          </Button>
        </NavLink>
      </div>

      <GlassCard level="raised" className="text-center py-16 px-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-slate-400 mb-4">
          <BarChart3 className="h-7 w-7 text-accent-indigo" />
        </div>
        <h3 className="text-base font-semibold text-slate-100 dark:text-slate-100 [data-theme=light]:text-slate-900">
          Dashboard View (Phase C &amp; D)
        </h3>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-400 [data-theme=light]:text-slate-600 max-w-md mx-auto leading-relaxed">
          Will feature a paginated glass table, animated click counters, gradient area charts, and
          referral breakdown.
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <NavLink to="/design">
            <Button variant="secondary" size="sm">
              View Design Components
            </Button>
          </NavLink>
        </div>
      </GlassCard>
    </div>
  );
};
