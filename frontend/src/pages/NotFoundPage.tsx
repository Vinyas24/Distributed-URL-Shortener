import React from 'react';
import { NavLink } from 'react-router-dom';
import { Compass, Home, LayoutDashboard } from 'lucide-react';
import { GlassCard, Button } from '@/components/ui';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <GlassCard level="raised" className="max-w-md w-full p-8 text-center relative overflow-hidden">
        {/* Ambient background glow */}
        <div
          className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-accent-indigo/20 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-accent-indigo mb-5">
          <Compass className="h-8 w-8 text-accent-cyan" />
        </div>

        <div className="font-mono text-5xl font-extrabold tracking-tighter bg-gradient-to-r from-accent-indigo via-accent-violet to-accent-coral bg-clip-text text-transparent">
          404
        </div>

        <h1 className="mt-3 text-lg font-bold text-slate-100">Page Not Found</h1>
        <p className="mt-2 text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
          The requested link or route doesn't exist, has expired, or may have been deleted from the
          cache.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <NavLink to="/">
            <Button
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              leftIcon={<Home className="h-4 w-4" />}
            >
              Back to Home
            </Button>
          </NavLink>

          <NavLink to="/dashboard">
            <Button
              variant="secondary"
              size="md"
              className="w-full sm:w-auto"
              leftIcon={<LayoutDashboard className="h-4 w-4" />}
            >
              Dashboard
            </Button>
          </NavLink>
        </div>
      </GlassCard>
    </div>
  );
};

export default NotFoundPage;
