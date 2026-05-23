import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, Key, Mail, Coins } from 'lucide-react';

interface LoginProps {
  onNavigate: (page: 'register' | 'forgot-password') => void;
  onAddToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function Login({ onNavigate, onAddToast }: LoginProps) {
  const { loginUser } = useAuth();
  const [emailOrId, setEmailOrId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrId.trim() || !password) {
      onAddToast('Please fill in all credentials.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      await loginUser(emailOrId, password);
      onAddToast('Logged in successfully!', 'success');
    } catch (err: any) {
      console.error(err);
      let errorMsg = 'Failed to sign in. Please verify your credentials.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMsg = 'Incorrect password or authentication error.';
      } else if (err.code === 'auth/user-not-found') {
        errorMsg = 'No user account found with this WePlay ID.';
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
          <div className="w-14 h-14 bg-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20 mb-4 animate-bounce">
            <Coins className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Red Envelope Vault
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 text-center font-medium">
            Sign in to manage packets or access host accounts
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              WePlay ID Number / Owner ID
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-3 bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500 text-slate-900 dark:text-white"
                placeholder="e.g. 19122007"
                value={emailOrId}
                onChange={(e) => setEmailOrId(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-slate-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">
                Security Password
              </label>
              <button
                type="button"
                onClick={() => onNavigate('forgot-password')}
                className="text-xs text-red-500 hover:underline hover:text-red-650 transition-colors font-medium cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Key className="w-4 h-4" />
              </span>
              <input
                type="password"
                className="w-full pl-10 pr-4 py-3 bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500 text-slate-900 dark:text-white"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-650 text-white rounded-xl font-semibold shadow-lg shadow-red-500/10 hover:shadow-red-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            <LogIn className="w-5 h-5" />
            {isLoading ? 'Signing into portal...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Need an account?{' '}
            <button
              onClick={() => onNavigate('register')}
              className="text-red-500 dark:text-red-400 font-semibold hover:underline hover:text-red-650 transition-colors cursor-pointer"
            >
              Register Here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
