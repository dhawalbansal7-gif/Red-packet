/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import WaitingApproval from './components/WaitingApproval';
import AdminDashboard from './components/AdminDashboard';
import SponsorDashboard from './components/SponsorDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import Toast, { ToastMessage } from './components/Toast';
import { Coins, Loader2 } from 'lucide-react';

type PageRoute = 'login' | 'register' | 'forgot-password';

function AppContent() {
  const { currentUser, userProfile, loading } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<PageRoute>('login');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast notifications dispatch triggers
  const addToast = (message: string, type: ToastMessage['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleNavigation = (page: PageRoute) => {
    setCurrentRoute(page);
  };

  // 1. Initial State Load check loading animation
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-tr from-red-600 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20 animate-spin">
            <Coins className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider font-mono">
            <Loader2 className="w-4 h-4 animate-spin" />
            Synchronizing with Firestore Vault...
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated User State
  if (!currentUser) {
    return (
      <>
        {/* Render Form Views */}
        {currentRoute === 'login' && (
          <Login onNavigate={handleNavigation} onAddToast={addToast} />
        )}
        {currentRoute === 'register' && (
          <Register onNavigate={handleNavigation} onAddToast={addToast} />
        )}
        {currentRoute === 'forgot-password' && (
          <ForgotPassword onNavigate={handleNavigation} onAddToast={addToast} />
        )}

        {/* Global Toast render stack */}
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full">
          {toasts.map((t) => (
            <Toast key={t.id} toast={t} onClose={removeToast} />
          ))}
        </div>
      </>
    );
  }

  // 3. Authenticated User Profile Routing based on role and clearance
  const approvalStatus = userProfile?.approvalStatus || 'Waiting for Approval';
  const role = userProfile?.role || 'pending';

  // Safeguard: Check waiting clearance
  const isApproved = approvalStatus === 'approved';
  const isPending = approvalStatus === 'Waiting for Approval';

  let renderedDashboard = <WaitingApproval onAddToast={addToast} />;

  if (isApproved) {
    if (role === 'admin') {
      renderedDashboard = <AdminDashboard onAddToast={addToast} />;
    } else if (role === 'sponsor') {
      renderedDashboard = <SponsorDashboard onAddToast={addToast} />;
    } else if (role === 'manager') {
      renderedDashboard = <ManagerDashboard onAddToast={addToast} />;
    } else {
      renderedDashboard = <WaitingApproval onAddToast={addToast} />;
    }
  } else {
    renderedDashboard = <WaitingApproval onAddToast={addToast} />;
  }

  return (
    <>
      {renderedDashboard}

      {/* Global Toast render stack */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={removeToast} />
        ))}
      </div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
