import { Clock, ShieldAlert, LogOut, Coins, HeartHandshake } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface WaitingApprovalProps {
  onAddToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function WaitingApproval({ onAddToast }: WaitingApprovalProps) {
  const { userProfile, logoutUser } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 text-center animate-fade-in">
        
        {/* Animated bounce ring */}
        <div className="mx-auto w-16 h-16 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-full flex items-center justify-center text-amber-500 mb-6 relative">
          <Clock className="w-8 h-8 text-amber-500 animate-spin" style={{ animationDuration: '8s' }} />
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-600 border-2 border-white dark:border-slate-900 rounded-full animate-ping" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
          Waiting for Approval
        </h2>
        
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 max-w-md mx-auto leading-relaxed">
          Hello <span className="font-bold text-slate-800 dark:text-white">{userProfile?.name}</span>, your profile has been recorded in our secure network registry successfully.
        </p>

        {/* Informative box */}
        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 my-6 text-left space-y-3.5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Pending Administrator Clearance</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Only the Owner/Admin Account (<span className="font-bold">ID: 19122007</span>) can verify registers, assign role permissions (<span className="italic">Sponsor</span> or <span className="italic">Manager</span>), and activate accounts.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-3.5">
            <Coins className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Red Envelope Dispenser Features</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Once approved, Sponsors can view assigned packages, switch statuses, and log volume history dynamically. Managers can invite sponsors and trigger allocations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button
            onClick={() => {
              window.location.reload();
              onAddToast('Refreshing dashboard state...', 'info');
            }}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-750 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 transition-all font-sans cursor-pointer"
          >
            Check Status Again
          </button>

          <button
            onClick={logoutUser}
            className="flex items-center justify-center gap-1.5 px-6 py-2.5 bg-red-500 hover:bg-red-650 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/10 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80 text-center">
          <p className="text-[10px] text-slate-400 font-mono tracking-wider">
            UID: {userProfile?.uid}
          </p>
        </div>

      </div>
    </div>
  );
}
