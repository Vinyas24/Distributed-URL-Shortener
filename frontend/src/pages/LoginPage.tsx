import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, ShieldCheck, Eye, EyeOff, Sparkles, ArrowRight } from 'lucide-react';
import { GlassCard, Button, Input, useToast } from '@/components/ui';
import { useAuth, DEMO_API_KEY } from '@/context/AuthContext';

export const LoginPage: React.FC = () => {
  const { loginWithApiKey, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  // If already authenticated, redirect
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectUrl, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginWithApiKey(apiKey);
      if (!res.success) {
        setError(res.error || 'Invalid API key');
        setLoading(false);
        return;
      }

      toast({
        type: 'success',
        title: 'Authentication Successful',
        message: 'Welcome to CalmLink Dashboard.',
      });
      navigate(redirectUrl, { replace: true });
    } catch {
      setError('An unexpected error occurred during authentication');
      setLoading(false);
    }
  };

  const handleUseDemoKey = () => {
    setApiKey(DEMO_API_KEY);
    setError(null);
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <GlassCard level="raised" className="p-8 sm:p-10 relative overflow-hidden">
        {/* Glow ambient highlight */}
        <div
          className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-accent-violet/20 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-accent-indigo via-accent-violet to-accent-coral shadow-glow-coral">
            <KeyRound className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 dark:text-slate-100 [data-theme=light]:text-slate-900">
              API Authentication
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-400 [data-theme=light]:text-slate-600">
              Enter your backend API key to access link management
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="relative">
            <Input
              label="Backend API Key"
              name="apiKey"
              type={showKey ? 'text' : 'password'}
              isMonospace
              placeholder="e.g. calm_live_key_..."
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                if (error) setError(null);
              }}
              error={error || undefined}
              helperText="Minimum 8 characters. Never shared or stored in browser storage."
              rightAddon={
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="text-slate-400 hover:text-slate-200 transition-colors focus-ring rounded p-1"
                  aria-label={showKey ? 'Hide API key' : 'Show API key'}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full justify-center"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Authenticate &amp; Continue
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleUseDemoKey}
              className="w-full justify-center"
              leftIcon={<Sparkles className="h-4 w-4 text-accent-coral" />}
            >
              Fill Demo API Key
            </Button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 flex items-start gap-3 text-xs text-slate-400 dark:text-slate-400 [data-theme=light]:text-slate-600">
          <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-300 dark:text-slate-300 [data-theme=light]:text-slate-700">
              In-Memory Security:
            </strong>{' '}
            Authentication tokens are kept exclusively in volatile browser memory and are never
            written to localStorage or persistent cookies.
          </p>
        </div>
      </GlassCard>
    </div>
  );
};

export default LoginPage;
