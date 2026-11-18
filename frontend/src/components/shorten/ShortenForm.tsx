import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2,
  Sparkles,
  ChevronDown,
  Calendar,
  Copy,
  Check,
  QrCode,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { GlassCard, Button, Input, Badge, useToast, Modal } from '@/components/ui';
import { apiClient, ApiError, getFriendlyErrorMessage, type UrlResponse } from '@/api/client';
import { validateUrlShortenForm } from '@/utils/validation';

export const ShortenForm: React.FC = () => {
  const { success, error: toastError } = useToast();

  // Form State
  const [originalUrl, setOriginalUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  // Status State
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<{
    title: string;
    description: string;
    traceId?: string;
    code?: string;
  } | null>(null);

  // Success State
  const [createdUrl, setCreatedUrl] = useState<UrlResponse | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Client-side validation
    const { isValid, errors } = validateUrlShortenForm(originalUrl, customCode, expiresAt);
    if (!isValid) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setIsLoading(true);

    try {
      const payload: { originalUrl: string; customCode?: string; expiresAt?: string } = {
        originalUrl: originalUrl.trim(),
      };
      if (customCode.trim()) {
        payload.customCode = customCode.trim();
      }
      if (expiresAt.trim()) {
        // Format to ISO 8601 UTC string
        payload.expiresAt = new Date(expiresAt).toISOString();
      }

      const response = await apiClient.createUrl(payload);
      setCreatedUrl(response);
      success('Link Shortened!', `Code: ${response.shortCode}`);
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err);
      setServerError({
        title: friendly.title,
        description: friendly.description,
        traceId: friendly.traceId,
        code: err instanceof ApiError ? err.code : undefined,
      });

      if (friendly.fieldErrors) {
        setFormErrors(friendly.fieldErrors);
      }

      toastError(friendly.title, friendly.description);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!createdUrl?.shortUrl) return;
    try {
      await navigator.clipboard.writeText(createdUrl.shortUrl);
      setHasCopied(true);
      success('Copied to Clipboard', createdUrl.shortUrl);
      setTimeout(() => setHasCopied(false), 2500);
    } catch {
      toastError('Copy Failed', 'Please manually select and copy the URL.');
    }
  };

  const handleReset = () => {
    setOriginalUrl('');
    setCustomCode('');
    setExpiresAt('');
    setCreatedUrl(null);
    setServerError(null);
    setFormErrors({});
    setHasCopied(false);
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <AnimatePresence mode="wait">
        {!createdUrl ? (
          /* Shorten Input Card */
          <motion.div
            key="input-form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <GlassCard level="raised" className="p-6 sm:p-8">
              <div className="mb-6 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-coral/20 text-accent-coral">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-100 dark:text-slate-100 [data-theme=light]:text-slate-900">
                    Shorten a long URL
                  </h2>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-400 [data-theme=light]:text-slate-600">
                  Enter your destination URL below to generate a fast, tracked short link.
                </p>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* Destination URL Input */}
                <Input
                  label="Destination URL"
                  id="original-url-input"
                  type="url"
                  placeholder="https://example.com/very/long/destination/url"
                  leftAddon={<Link2 className="h-4 w-4" />}
                  value={originalUrl}
                  onChange={(e) => {
                    setOriginalUrl(e.target.value);
                    if (formErrors.originalUrl) {
                      setFormErrors((prev) => ({ ...prev, originalUrl: '' }));
                    }
                  }}
                  error={formErrors.originalUrl}
                  required
                  autoFocus
                />

                {/* Collapsible Custom Code & Expiry Section */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setIsOptionsOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between py-2 text-xs font-semibold text-slate-300 dark:text-slate-300 [data-theme=light]:text-slate-700 hover:text-white transition-colors focus-ring rounded"
                    aria-expanded={isOptionsOpen}
                    aria-controls="advanced-shorten-options"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-accent-indigo" />
                      Custom short code &amp; expiration
                    </span>
                    <motion.div
                      animate={{ rotate: isOptionsOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {isOptionsOpen && (
                      <motion.div
                        id="advanced-shorten-options"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        className="overflow-hidden space-y-4 pt-3 pb-1"
                      >
                        <Input
                          label="Custom Short Code (Optional)"
                          id="custom-code-input"
                          placeholder="my-link-name"
                          isMonospace
                          helperText="3-15 chars: letters, numbers, hyphens and underscores"
                          leftAddon={<span className="text-xs font-mono font-bold">/</span>}
                          value={customCode}
                          onChange={(e) => {
                            setCustomCode(e.target.value);
                            if (formErrors.customCode) {
                              setFormErrors((prev) => ({ ...prev, customCode: '' }));
                            }
                          }}
                          error={formErrors.customCode}
                        />

                        <Input
                          label="Expiration Date &amp; Time (Optional)"
                          id="expires-at-input"
                          type="datetime-local"
                          leftAddon={<Calendar className="h-4 w-4" />}
                          helperText="Link will return 410 Gone after this timestamp"
                          value={expiresAt}
                          onChange={(e) => {
                            setExpiresAt(e.target.value);
                            if (formErrors.expiresAt) {
                              setFormErrors((prev) => ({ ...prev, expiresAt: '' }));
                            }
                          }}
                          error={formErrors.expiresAt}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Inline Server Error Message (409 Conflict, 429 Rate Limit, etc.) */}
                <AnimatePresence>
                  {serverError && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className={`rounded-glass-sm p-4 text-left border ${
                        serverError.code === 'SHORT_CODE_TAKEN'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                          : serverError.code === 'RATE_LIMITED'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                          : 'bg-red-500/10 border-red-500/30 text-red-200'
                      }`}
                      role="alert"
                    >
                      <div className="flex items-start gap-3">
                        {serverError.code === 'RATE_LIMITED' ? (
                          <ShieldAlert className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold">{serverError.title}</p>
                          <p className="mt-1 text-xs opacity-90 leading-relaxed">
                            {serverError.description}
                          </p>
                          {serverError.traceId && (
                            <p className="mt-2 text-[10px] font-mono opacity-60">
                              Trace ID: {serverError.traceId}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Shorten Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    isLoading={isLoading}
                    disabled={!originalUrl.trim()}
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    Shorten Link
                  </Button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        ) : (
          /* Success State Card with Soft Glow */
          <motion.div
            key="success-result"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative"
          >
            {/* Ambient Coral Glow */}
            <div className="absolute -inset-1 rounded-glass-xl bg-gradient-to-r from-accent-indigo via-accent-violet to-accent-coral opacity-30 blur-xl pointer-events-none" />

            <GlassCard level="raised" className="relative p-6 sm:p-8 border-white/25">
              <div className="flex items-center justify-between mb-4">
                <Badge variant="success">
                  <Check className="mr-1 h-3 w-3" />
                  Link Created Successfully
                </Badge>
                {createdUrl.custom && <Badge variant="accent">Custom Code</Badge>}
              </div>

              {/* Short URL Box in Monospace */}
              <div className="my-5 rounded-glass-md bg-white/5 dark:bg-white/10 [data-theme=light]:bg-slate-900/5 p-4 border border-white/10 text-left">
                <p className="text-[11px] font-medium text-slate-400 mb-1">Your Short Link</p>
                <div className="flex items-center justify-between gap-3">
                  <a
                    href={createdUrl.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base sm:text-lg font-mono font-semibold text-accent-cyan hover:underline truncate inline-flex items-center gap-1.5 focus-ring rounded"
                  >
                    <span>{createdUrl.shortUrl}</span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-70 shrink-0" />
                  </a>
                </div>
              </div>

              {/* Destination Truncated Details */}
              <div className="mb-6 text-left text-xs text-slate-400 dark:text-slate-400 [data-theme=light]:text-slate-600 space-y-1.5">
                <p className="truncate">
                  <span className="font-medium text-slate-300 dark:text-slate-300 [data-theme=light]:text-slate-700">
                    Destination:{' '}
                  </span>
                  {createdUrl.originalUrl}
                </p>
                {createdUrl.expiresAt && (
                  <p className="flex items-center gap-1 text-amber-400">
                    <Clock className="h-3.5 w-3.5" />
                    Expires: {new Date(createdUrl.expiresAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Action Buttons: Copy, QR Code, Shorten Another */}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleCopy}
                  className="flex-1 min-w-[140px]"
                  leftIcon={hasCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                >
                  {hasCopied ? 'Copied!' : 'Copy Link'}
                </Button>

                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setShowQrModal(true)}
                  leftIcon={<QrCode className="h-4 w-4" />}
                >
                  QR Code
                </Button>

                <Button
                  variant="ghost"
                  size="md"
                  onClick={handleReset}
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                  aria-label="Shorten another link"
                >
                  New Link
                </Button>
              </div>
            </GlassCard>

            {/* QR Code Modal */}
            <Modal
              isOpen={showQrModal}
              onClose={() => setShowQrModal(false)}
              title="QR Code"
              description="Scan with any smartphone camera to visit the destination."
              footer={
                <Button variant="secondary" size="sm" onClick={() => setShowQrModal(false)}>
                  Done
                </Button>
              }
            >
              <div className="flex flex-col items-center justify-center p-4">
                <div className="p-4 bg-white rounded-glass-md shadow-lg">
                  <QRCodeSVG
                    value={createdUrl.shortUrl || ''}
                    size={180}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <p className="mt-3 text-xs font-mono text-slate-300 dark:text-slate-300 [data-theme=light]:text-slate-700 break-all text-center">
                  {createdUrl.shortUrl}
                </p>
              </div>
            </Modal>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
