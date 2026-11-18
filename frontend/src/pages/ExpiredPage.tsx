import React from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { Clock, Plus, LayoutDashboard } from 'lucide-react';
import { GlassCard, Button } from '@/components/ui';

export const ExpiredPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <GlassCard level="raised" className="max-w-md w-full p-8 text-center relative overflow-hidden">
        {/* Warm amber/coral ambient glow */}
        <div
          className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-amber-500/15 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-5">
          <Clock className="h-8 w-8" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-slate-100">
          Link Has Expired
        </h1>

        {code && (
          <div className="mt-2 inline-block px-3 py-1 rounded-lg bg-white/5 border border-white/10 font-mono text-xs text-accent-cyan">
            /{code}
          </div>
        )}

        <p className="mt-3 text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
          This short URL had an expiration date that has elapsed. Redirection to the destination has
          been safely terminated per the link owner's policy.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <NavLink to="/">
            <Button
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Shorten New Link
            </Button>
          </NavLink>

          <NavLink to="/dashboard">
            <Button
              variant="secondary"
              size="md"
              className="w-full sm:w-auto"
              leftIcon={<LayoutDashboard className="h-4 w-4" />}
            >
              Go to Dashboard
            </Button>
          </NavLink>
        </div>
      </GlassCard>
    </div>
  );
};

export default ExpiredPage;
