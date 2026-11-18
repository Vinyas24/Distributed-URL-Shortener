import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setShowRestored(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {(isOffline || showRestored) && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-3 pointer-events-none"
        >
          <div
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-medium backdrop-blur-xl shadow-glass-raised border transition-colors ${
              isOffline
                ? 'bg-amber-950/70 border-amber-500/40 text-amber-200'
                : 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
            }`}
          >
            {isOffline ? (
              <>
                <WifiOff className="h-4 w-4 text-amber-400 shrink-0 animate-pulse" />
                <span>
                  <strong>You are currently offline.</strong> Link creation and modifications will
                  fail until connectivity is restored.
                </span>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="ml-2 underline text-amber-300 hover:text-white flex items-center gap-1 focus-ring rounded"
                  aria-label="Retry connection by reloading"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </button>
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Connection restored.</strong> You are back online.
                </span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
