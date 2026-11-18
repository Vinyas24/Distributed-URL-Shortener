import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export const AuroraBackground: React.FC = () => {
  const location = useLocation();
  const backgroundRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);

  // Route-based hue shift
  useEffect(() => {
    let hue = '0deg';
    if (location.pathname.startsWith('/dashboard')) {
      hue = '25deg';
    } else if (location.pathname.startsWith('/links') || location.pathname.startsWith('/stats')) {
      hue = '-25deg';
    } else if (location.pathname.startsWith('/expired')) {
      hue = '-55deg';
    } else if (location.pathname.startsWith('/login') || location.pathname.startsWith('/auth')) {
      hue = '45deg';
    }

    if (backgroundRef.current) {
      backgroundRef.current.style.setProperty('--aurora-hue', hue);
    }
  }, [location.pathname]);

  // Gentle pointer parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (rafId.current) cancelAnimationFrame(rafId.current);

      rafId.current = requestAnimationFrame(() => {
        if (!backgroundRef.current) return;
        const x = (e.clientX / window.innerWidth - 0.5) * 30; // max 15px displacement
        const y = (e.clientY / window.innerHeight - 0.5) * 30;
        backgroundRef.current.style.setProperty('--parallax-x', `${x.toFixed(1)}px`);
        backgroundRef.current.style.setProperty('--parallax-y', `${y.toFixed(1)}px`);
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <div
      ref={backgroundRef}
      id="aurora-background"
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden will-change-transform transition-all duration-1000 ease-out"
      style={{
        filter: 'hue-rotate(var(--aurora-hue, 0deg))',
      }}
    >
      {/* Aurora Gradient Container with Parallax */}
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{
          transform: 'translate(var(--parallax-x, 0px), var(--parallax-y, 0px))',
        }}
      >
        {/* Blob 1: Indigo & Cyan Drift (Top Left) */}
        <div
          className="aurora-blob absolute -top-[15%] -left-[10%] w-[55vw] h-[55vw] rounded-full blur-[90px] md:blur-[120px] opacity-40 dark:opacity-35 animate-aurora-1"
          style={{
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.8) 0%, rgba(6, 182, 212, 0.4) 60%, transparent 80%)',
          }}
        />

        {/* Blob 2: Violet & Purple Drift (Bottom Right) */}
        <div
          className="aurora-blob absolute -bottom-[15%] -right-[10%] w-[60vw] h-[60vw] rounded-full blur-[100px] md:blur-[130px] opacity-35 dark:opacity-30 animate-aurora-2"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.75) 0%, rgba(99, 102, 241, 0.35) 60%, transparent 80%)',
          }}
        />

        {/* Blob 3: Deep Midnight Blue Anchor (Center Left) */}
        <div
          className="aurora-blob absolute top-[30%] -left-[5%] w-[45vw] h-[45vw] rounded-full blur-[80px] md:blur-[110px] opacity-30 dark:opacity-25 animate-aurora-3"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.6) 0%, rgba(30, 27, 75, 0.4) 70%, transparent 85%)',
          }}
        />

        {/* Blob 4: Warm Coral Subtle Accent Glow (Center Right) */}
        <div
          className="aurora-blob absolute top-[20%] right-[15%] w-[35vw] h-[35vw] rounded-full blur-[90px] md:blur-[120px] opacity-25 dark:opacity-20 animate-aurora-4"
          style={{
            background: 'radial-gradient(circle, rgba(244, 63, 94, 0.65) 0%, rgba(251, 113, 133, 0.25) 50%, transparent 75%)',
          }}
        />
      </div>

      {/* Tactile SVG Noise Texture Overlay */}
      <div className="absolute inset-0 bg-noise pointer-events-none mix-blend-overlay" />

      {/* Subtle Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,rgba(11,11,26,0.3)_100%)] dark:bg-[radial-gradient(circle_at_center,transparent_40%,rgba(11,11,26,0.6)_100%)]" />
    </div>
  );
};
