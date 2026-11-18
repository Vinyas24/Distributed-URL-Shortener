import React from 'react';
import { NavLink } from 'react-router-dom';
import { Link2, LogIn, LogOut, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="sticky top-4 sm:top-5 z-40 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      <nav className="glass-raised flex h-16 items-center justify-between rounded-glass-xl px-5 sm:px-7 shadow-glass-raised">
        <NavLink
          to="/"
          className="flex items-center gap-3 text-base font-semibold tracking-tight text-slate-100 dark:text-slate-100 [data-theme=light]:text-slate-900 focus-ring rounded-lg py-1"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-accent-indigo via-accent-violet to-accent-coral shadow-glow-coral">
            <Link2 className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="tracking-tight text-base sm:text-lg">
            Calm<span className="text-accent-coral font-bold">Link</span>
          </span>
        </NavLink>

        <div className="flex items-center gap-1.5 sm:gap-3.5">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `px-3.5 py-2 rounded-glass-sm text-sm font-medium transition-colors focus-ring ${
                isActive
                  ? 'bg-white/10 dark:bg-white/15 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`
            }
          >
            Home
          </NavLink>

          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `px-3.5 py-2 rounded-glass-sm text-sm font-medium transition-colors focus-ring ${
                isActive
                  ? 'bg-white/10 dark:bg-white/15 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`
            }
          >
            Dashboard
          </NavLink>

          <div className="h-5 w-px bg-white/10 mx-1.5" aria-hidden="true" />

          {/* Authentication status / action */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2.5">
              <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium text-slate-200 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-sm">
                <User className="h-3.5 w-3.5 text-accent-cyan" />
                {user?.name}
              </span>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-glass-sm text-xs sm:text-sm font-medium text-rose-300 hover:text-rose-100 hover:bg-rose-500/10 transition-colors focus-ring"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <NavLink
              to="/login"
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-glass-sm text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 focus-ring ${
                  isActive
                    ? 'bg-white/10 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`
              }
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Sign In</span>
            </NavLink>
          )}
        </div>
      </nav>
    </header>
  );
};
