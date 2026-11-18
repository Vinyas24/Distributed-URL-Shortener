import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuroraBackground } from '@/components/layout/AuroraBackground';
import { Navbar } from '@/components/layout/Navbar';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ToastProvider, Skeleton } from '@/components/ui';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Route-level code splitting (Rule 7: initial JS under 200 KB)
const HomePage = lazy(() => import('@/pages/HomePage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const LinkDetailsPage = lazy(() => import('@/pages/LinkDetailsPage'));
const ExpiredPage = lazy(() => import('@/pages/ExpiredPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

const PageLoader: React.FC = () => (
  <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 space-y-6">
    <Skeleton className="h-10 w-48 rounded-xl" />
    <Skeleton className="h-64 w-full rounded-2xl" />
  </div>
);

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <div className="relative min-h-screen flex flex-col font-sans">
            {/* Global Offline Network Status Banner */}
            <OfflineBanner />

            {/* Persistent 60fps Aurora Background */}
            <AuroraBackground />

            {/* Global Navigation */}
            <Navbar />

            {/* Routed Content with Lazy Code Splitting */}
            <main className="flex-1 pb-16">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <DashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/links/:code" element={<LinkDetailsPage />} />
                  <Route path="/stats/:code" element={<LinkDetailsPage />} />
                  <Route path="/expired" element={<ExpiredPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </main>
          </div>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
