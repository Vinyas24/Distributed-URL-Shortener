import React from 'react';
import { GlassCard, Badge } from '@/components/ui';
import { ShortenForm } from '@/components/shorten/ShortenForm';
import { Sparkles, Zap, Shield } from 'lucide-react';

export const HomePage: React.FC = () => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 text-center space-y-12">
      {/* Hero Header */}
      <div>
        <div className="inline-flex mb-4">
          <Badge variant="accent" size="md">
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-accent-coral" />
            Distributed Architecture
          </Badge>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-100 dark:text-slate-100 [data-theme=light]:text-slate-900 leading-[1.1]">
          Fast, Calm &amp; Resilient <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-accent-indigo via-accent-violet to-accent-coral bg-clip-text text-transparent">
            Short Links
          </span>
        </h1>

        <p className="mt-4 text-sm sm:text-base text-slate-400 dark:text-slate-400 [data-theme=light]:text-slate-600 max-w-2xl mx-auto leading-relaxed">
          High-performance URL shortener engineered for p99 &lt; 50ms redirects,
          Snowflake Base62 IDs, Redis cache-aside, and real-time async click analytics.
        </p>
      </div>

      {/* Hero Center Glass Card: URL Shortening Flow */}
      <div className="max-w-2xl mx-auto">
        <ShortenForm />
      </div>

      {/* Architecture Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left pt-4">
        <GlassCard level="raised" interactive>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-indigo/20 text-accent-indigo mb-3">
            <Zap className="h-5 w-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-100 dark:text-slate-100 [data-theme=light]:text-slate-900">
            Sub-10ms Latency
          </h3>
          <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-400 [data-theme=light]:text-slate-600 leading-relaxed">
            Redis read-through caching with jittered TTL, negative caching, and automatic fallback.
          </p>
        </GlassCard>

        <GlassCard level="raised" interactive>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-coral/20 text-accent-coral mb-3">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-100 dark:text-slate-100 [data-theme=light]:text-slate-900">
            Snowflake Base62
          </h3>
          <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-400 [data-theme=light]:text-slate-600 leading-relaxed">
            Coordinated 64-bit ID generator ensuring global uniqueness without check-then-insert.
          </p>
        </GlassCard>

        <GlassCard level="raised" interactive>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-cyan/20 text-accent-cyan mb-3">
            <Shield className="h-5 w-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-100 dark:text-slate-100 [data-theme=light]:text-slate-900">
            Abuse &amp; SSRF Shield
          </h3>
          <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-400 [data-theme=light]:text-slate-600 leading-relaxed">
            Token-bucket rate limits, reserved-code blocklists, and DNS hostname resolution checks.
          </p>
        </GlassCard>
      </div>
    </div>
  );
};

export default HomePage;
