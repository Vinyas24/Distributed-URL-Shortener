import React, { useState } from 'react';
import {
  GlassCard,
  Button,
  Input,
  Badge,
  Skeleton,
  Modal,
  useToast,
} from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import {
  Link2,
  Copy,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  Layers,
  Palette,
} from 'lucide-react';

export const DesignSystemPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { success, error, info, warning } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const [btnLoading, setBtnLoading] = useState(false);

  const simulateLoading = () => {
    setBtnLoading(true);
    setTimeout(() => {
      setBtnLoading(false);
      success('Action completed', 'Button action resolved successfully.');
    }, 1500);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-10 text-center">
        <Badge variant="accent" className="mb-3">
          <Palette className="mr-1.5 h-3.5 w-3.5" />
          Design System & Token Showcase
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-100 dark:text-slate-100 [data-theme=light]:text-slate-900">
          "Calm Glass" Aesthetic
        </h1>
        <p className="mt-2 text-sm text-slate-400 dark:text-slate-400 [data-theme=light]:text-slate-600 max-w-xl mx-auto">
          Multi-tiered translucent glassmorphism with verified WCAG AA contrast, gentle aurora
          lighting, and tactile SVG noise grain.
        </p>

        <div className="mt-4 flex items-center justify-center gap-3">
          <Button variant="secondary" size="sm" onClick={toggleTheme}>
            Toggle Theme (Current: <span className="font-semibold capitalize ml-1">{theme}</span>)
          </Button>
        </div>
      </div>

      <div className="space-y-10">
        {/* Section 1: Glass Tiers */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-5 w-5 text-accent-indigo" />
            <h2 className="text-lg font-semibold text-slate-100 dark:text-slate-100 [data-theme=light]:text-slate-900">
              1. Glassmorphism Tiers (Base, Raised, Overlay)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard level="base">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-accent-cyan uppercase tracking-wider">
                  Level 1: Base
                </span>
                <Badge variant="default" size="sm">16px blur</Badge>
              </div>
              <h3 className="text-base font-semibold text-slate-100 dark:text-slate-100 [data-theme=light]:text-slate-900">
                Page Container
              </h3>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-400 [data-theme=light]:text-slate-600 leading-relaxed">
                Subtle frosted panel for page regions and secondary framing. 6% white opacity in dark mode.
              </p>
            </GlassCard>

            <GlassCard level="raised" interactive>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-accent-indigo uppercase tracking-wider">
                  Level 2: Raised (Hover)
                </span>
                <Badge variant="accent" size="sm">20px blur</Badge>
              </div>
              <h3 className="text-base font-semibold text-slate-100 dark:text-slate-100 [data-theme=light]:text-slate-900">
                Interactive Card
              </h3>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-400 [data-theme=light]:text-slate-600 leading-relaxed">
                Elevated card with 1px top highlight, soft shadow, and subtle spring lift on hover.
              </p>
            </GlassCard>

            <GlassCard level="overlay">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-accent-coral uppercase tracking-wider">
                  Level 3: Overlay
                </span>
                <Badge variant="warning" size="sm">24px blur</Badge>
              </div>
              <h3 className="text-base font-semibold text-slate-100 dark:text-slate-100 [data-theme=light]:text-slate-900">
                Modal & Popover
              </h3>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-400 [data-theme=light]:text-slate-600 leading-relaxed">
                High-density glass with enhanced backdrop saturation for critical overlays and toasts.
              </p>
            </GlassCard>
          </div>
        </section>

        {/* Section 2: Buttons */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-accent-coral" />
            <h2 className="text-lg font-semibold text-slate-100 dark:text-slate-100 [data-theme=light]:text-slate-900">
              2. Button Hierarchy & States
            </h2>
          </div>

          <GlassCard level="raised" className="space-y-6">
            <div>
              <p className="text-xs font-medium text-slate-400 mb-3">Variants</p>
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="primary" leftIcon={<Link2 className="h-4 w-4" />}>
                  Primary Action
                </Button>
                <Button variant="secondary" leftIcon={<Copy className="h-4 w-4" />}>
                  Secondary Glass
                </Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="danger">Danger Action</Button>
                <Button
                  variant="primary"
                  isLoading={btnLoading}
                  onClick={simulateLoading}
                >
                  Click for Loading
                </Button>
                <Button variant="primary" disabled>
                  Disabled
                </Button>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400 mb-3">Sizes (&gt;=44px touch compliant)</p>
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="secondary" size="sm">
                  Small (40px / 44px min touch)
                </Button>
                <Button variant="secondary" size="md">
                  Medium (44px)
                </Button>
                <Button variant="secondary" size="lg">
                  Large (52px)
                </Button>
              </div>
            </div>
          </GlassCard>
        </section>

        {/* Section 3: Inputs & Forms */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="h-5 w-5 text-accent-cyan" />
            <h2 className="text-lg font-semibold text-slate-100 dark:text-slate-100 [data-theme=light]:text-slate-900">
              3. Inputs & Form Fields
            </h2>
          </div>

          <GlassCard level="raised">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Destination URL"
                placeholder="https://example.com/very/long/destination/url"
                helperText="Must be a valid http or https URL (max 2,048 chars)"
                leftAddon={<ExternalLink className="h-4 w-4" />}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (e.target.value.includes('localhost')) {
                    setInputError('Localhost and private network URLs are prohibited (SSRF prevention)');
                  } else {
                    setInputError('');
                  }
                }}
                error={inputError}
              />

              <Input
                label="Custom Short Code (Optional)"
                placeholder="launch-2026"
                isMonospace
                helperText="3-15 chars: [A-Za-z0-9_-], no reserved words"
                leftAddon={<span className="text-xs font-mono font-bold">/</span>}
                defaultValue="my-custom-link"
              />
            </div>
          </GlassCard>
        </section>

        {/* Section 4: Badges & Skeletons */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-slate-100 dark:text-slate-100 [data-theme=light]:text-slate-900">
              4. Badges, Status Indicators & Skeletons
            </h2>
          </div>

          <GlassCard level="raised" className="space-y-6">
            <div>
              <p className="text-xs font-medium text-slate-400 mb-3">Status Badges</p>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="default">Default Status</Badge>
                <Badge variant="success">Active (302)</Badge>
                <Badge variant="accent">Custom Code</Badge>
                <Badge variant="warning">Expiring Soon</Badge>
                <Badge variant="danger">Expired (410)</Badge>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400 mb-3">Skeleton Loading States</p>
              <div className="space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              </div>
            </div>
          </GlassCard>
        </section>

        {/* Section 5: Interactive Modals & Toasts */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-accent-violet" />
            <h2 className="text-lg font-semibold text-slate-100 dark:text-slate-100 [data-theme=light]:text-slate-900">
              5. Interactive Modals & Toasts (ARIA Live Region)
            </h2>
          </div>

          <GlassCard level="raised">
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                Open Glass Modal
              </Button>

              <Button
                variant="secondary"
                onClick={() => success('Link Copied!', 'https://calm.link/abc1234 copied to clipboard.')}
              >
                Trigger Success Toast
              </Button>

              <Button
                variant="secondary"
                onClick={() =>
                  error('Rate Limited', 'Too many links created. Please try again in 15 seconds.')
                }
              >
                Trigger Error Toast
              </Button>

              <Button
                variant="secondary"
                onClick={() =>
                  warning('Link Expiring', 'This short URL will expire in 24 hours.')
                }
              >
                Trigger Warning Toast
              </Button>

              <Button
                variant="ghost"
                onClick={() => info('Cache Hit', 'Resolved in 1.49ms from Redis cache-aside.')}
              >
                Trigger Info Toast
              </Button>
            </div>
          </GlassCard>
        </section>
      </div>

      {/* Accessible Interactive Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Delete Short Link?"
        description="Are you sure you want to delete this short code? This action immediately purges the Redis cache."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setIsModalOpen(false);
                success('Link Deleted', 'The link was deleted and cache was invalidated.');
              }}
            >
              Confirm Delete
            </Button>
          </>
        }
      >
        <div className="rounded-glass-sm bg-white/5 p-3 text-xs font-mono text-slate-300">
          Target: https://example.com/production/release-notes-2026
        </div>
      </Modal>
    </div>
  );
};
