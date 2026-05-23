import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, ArrowLeft, Send } from 'lucide-react';

interface ForgotPasswordProps {
  onNavigate: (page: 'login') => void;
  onAddToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function ForgotPassword({ onNavigate, onAddToast }: ForgotPasswordProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-4 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-8 animate-fade-in animate-duration-300">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20 mb-4 animate-pulse">
            <Mail className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Access Recovery
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 text-center font-medium">
            How to regain access to your workspace
          </p>
        </div>

        <div className="bg-amber-50 dark:bg-amber-955/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-5 mb-6 text-xs text-amber-950 dark:text-amber-200 leading-relaxed space-y-3">
          <p className="font-semibold text-sm">No Registered Email Addresses</p>
          <p>
            To protect player privacy, the Red Packet portal no longer collects, stores, or utilizes secure email addresses. Accounts are authenticated solely by WePlay ID Numbers.
          </p>
          <p className="border-t border-amber-200 dark:border-amber-800/40 pt-3">
            If you have forgotten your password, please contact the <span className="font-bold">Portal Administrator / System Owner (ID: 19122007)</span>.
            The administrator can instantly reset, change, or update your password directly from the administrative oversight board.
          </p>
        </div>

        <button
          onClick={() => onNavigate('login')}
          className="mt-2 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-800 dark:hover:text-slate-200 mx-auto transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </button>
      </div>
    </div>
  );
}
