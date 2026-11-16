import React from 'react';
import { NavLink } from 'react-router-dom';
import { Link2, Sun, Moon, Palette } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-4 z-40 mx-auto max-w-5xl px-4 sm:px-6">
      <nav className="glass-raised flex h-14 items-center justify-between rounded-glass-xl px-4 sm:px-6">
        <NavLink
          to="/"
          className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-slate-100 dark:text-slate-100 [data-theme=light]:text-slate-900 focus-ring rounded-lg"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-accent-indigo via-accent-violet to-accent-coral shadow-glow-coral">
            <Link2 className="h-4 w-4 text-white" />
          </div>
          <span>Calm<span className="text-accent-coral font-bold">Link</span></span>
        </NavLink>

        <div className="flex items-center gap-1 sm:gap-3">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus-ring ${
                isActive
                  ? 'bg-white/10 dark:bg-white/15 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            Home
          </NavLink>

          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus-ring ${
                isActive
                  ? 'bg-white/10 dark:bg-white/15 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/design"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 focus-ring ${
                isActive
                  ? 'bg-white/10 dark:bg-white/15 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <Palette className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Design System</span>
          </NavLink>

          <div className="h-4 w-px bg-white/10 mx-1" aria-hidden="true" />

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors focus-ring"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-300" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-500" />
            )}
          </button>
        </div>
      </nav>
    </header>
  );
};
