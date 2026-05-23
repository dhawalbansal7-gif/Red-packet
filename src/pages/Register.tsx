import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserPlus, User, Mail, ShieldCheck, HeartHandshake, Eye, EyeOff } from 'lucide-react';

interface RegisterProps {
  onNavigate: (page: 'login') => void;
  onAddToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function Register({ onNavigate, onAddToast }: RegisterProps) {
  const { registerUser } = useAuth();
  const [name, setName] = useState('');
  const [weplayId, setWeplayId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !weplayId.trim() || !password) {
      onAddToast('Please fill out all registration fields.', 'warning');
      return;
    }

    if (password.length < 6) {
      onAddToast('Password must be at least 6 characters long.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      await registerUser(name.trim(), weplayId.trim(), password);
      onAddToast('Account successfully created! Please wait for Administrator Approval.', 'success');
      onNavigate('login');
    } catch (err: any) {
      console.error(err);
      let errorMsg = 'Could not register user. Please verify user info.';
      if (err.code === 'auth/email-already-in-use') {
        errorMsg = 'This WePlay ID is already registered.';
      } else if (err.code === 'auth/weak-password') {
        errorMsg = 'Password strength issues. Try containing numbers and symbols.';
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMsg = 'Email & Password authentication is disabled in your Firebase console. Please visit Firebase Console > Authentication > Sign-in method and enable it.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      onAddToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-4 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-8 animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20 mb-4 animate-pulse">
            <HeartHandshake className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Sponsor/Manager Registry
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 text-center font-medium">
            Create an account to join the Red Packet network
          </p>
        </div>

        {/* Clear Role and Approval notice */}
        <div className="bg-sky-50 dark:bg-sky-955/20 border border-sky-100 dark:border-sky-800/40 rounded-xl p-4 mb-6 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
          <div className="text-xs text-sky-950 dark:text-sky-200 leading-relaxed">
            <span className="font-semibold">Important Security Notice:</span> All registered accounts are initialized inside the <span className="font-semibold">"Waiting for Approval"</span> queue. An Administrator must manually authenticate, green-light your access, and assign your explicit role (<span className="italic">Sponsor</span> or <span className="italic">Manager</span>) before you can deploy red packets.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1.5">
              Full Legal Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-955 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                placeholder="Ex. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1.5">
              WePlay ID Number
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-955 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                placeholder="e.g. 19122007"
                value={weplayId}
                onChange={(e) => setWeplayId(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1.5">
              Account Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <HeartHandshake className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-955 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-450 hover:text-slate-650 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-650 text-white rounded-xl font-semibold shadow-lg shadow-red-500/10 hover:shadow-red-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none mt-2 cursor-pointer"
          >
            <UserPlus className="w-5 h-5" />
            {isLoading ? 'Sending credentials...' : 'Register Profile'}
          </button>
        </form>
 
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <button
              onClick={() => onNavigate('login')}
              className="text-red-500 dark:text-red-400 font-semibold hover:underline hover:text-red-650 transition-colors cursor-pointer"
            >
              Sign In Here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
