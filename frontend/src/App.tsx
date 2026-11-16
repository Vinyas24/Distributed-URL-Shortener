import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuroraBackground } from '@/components/layout/AuroraBackground';
import { Navbar } from '@/components/layout/Navbar';
import { ToastProvider } from '@/components/ui';
import { HomePage } from '@/pages/HomePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DesignSystemPage } from '@/pages/DesignSystemPage';

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <div className="relative min-h-screen flex flex-col font-sans">
        {/* Persistent 60fps Aurora Background */}
        <AuroraBackground />

        {/* Global Navigation */}
        <Navbar />

        {/* Routed Content */}
        <main className="flex-1 pb-16">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/design" element={<DesignSystemPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  );
};
