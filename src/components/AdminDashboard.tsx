import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { UserProfile, AuditLog, Packet } from '../types';
import {
  Users,
  UserCheck,
  UserX,
  UserMinus,
  Settings,
  ListCollapse,
  Shield,
  Search,
  Check,
  X,
  AlertOctagon,
  LogOut,
  Sparkles,
  Inbox,
  Clock,
  ExternalLink,
  Coins,
  RefreshCw,
  BellRing
} from 'lucide-react';

interface AdminDashboardProps {
  onAddToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

type AdminTab = 'users' | 'logs' | 'packets' | 'notifications';

export default function AdminDashboard({ onAddToast }: AdminDashboardProps) {
  const { userProfile, logoutUser } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  // Real-time states
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Filter/Search states
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [logSearch, setLogSearch] = useState('');

  // Notifications inputs
  const [notifTarget, setNotifTarget] = useState('all');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);

  // 1. Subscribe to Users
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        list.push({
          uid: d.uid,
          name: d.name || 'Anonymous',
          email: d.email || '',
          role: d.role || 'pending',
          approvalStatus: d.approvalStatus || 'Waiting for Approval',
          createdAt: d.createdAt,
          lastLogin: d.lastLogin,
        });
      });
      setUsers(list);
    }, (err) => {
      console.error("Users subscribe failed:", err);
    });
    return unsubscribe;
  }, []);

  // 2. Subscribe to Logs
  useEffect(() => {
    const q = query(collection(db, 'logs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: AuditLog[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          userId: d.userId || '',
          userName: d.userName || '',
          userRole: d.userRole || '',
          action: d.action || '',
          details: d.details || '',
          createdAt: d.createdAt,
        });
      });
      setLogs(list);
    }, (err) => {
      console.error("Logs subscribe failed:", err);
    });
    return unsubscribe;
  }, []);

  // 3. Subscribe to all Packets
  useEffect(() => {
    const q = query(collection(db, 'packets'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Packet[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: d.id,
          sponsorId: d.sponsorId || '',
          sponsorName: d.sponsorName || '',
          type: d.type || '600 Coins Red Packet',
          status: d.status || 'Pending',
          amount: d.amount || 600,
          createdAt: d.createdAt,
          assignedBy: d.assignedBy || '',
          notes: d.notes || '',
        });
      });
      setPackets(list);
    }, (err) => {
      console.error("Packets subscribe failed:", err);
    });
    return unsubscribe;
  }, []);

  // 4. Subscribe to Notifications (admin generated or systems)
  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        list.push({ id: doc.id, ...d });
      });
      setNotifications(list);
    }, (err) => {
      console.error("Notifications subscribe failed:", err);
    });
    return unsubscribe;
  }, []);

  // Write audit log helper
  const submitLog = async (action: string, details: string) => {
    try {
      const logId = crypto.randomUUID();
      await setDoc(doc(db, 'logs', logId), {
        id: logId,
        userId: userProfile?.uid || 'admin',
        userName: userProfile?.name || 'Owner / Admin',
        userRole: 'admin',
        action,
        details,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Error creating audit log:", e);
    }
  };

  // Admin Actions
  const handleUpdateStatus = async (targetUid: string, targetName: string, newStatus: UserProfile['approvalStatus']) => {
    try {
      await updateDoc(doc(db, 'users', targetUid), {
        approvalStatus: newStatus,
      });
      onAddToast(`Approval status for ${targetName} updated to: ${newStatus}`, 'success');
      await submitLog('Update User Approval Status', `Admin set ${targetName} status to ${newStatus}.`);

      // Auto-send in-app notification to the target user
      const notifId = crypto.randomUUID();
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        userId: targetUid,
        title: `Account Status Update`,
        message: `Your account registration status has been updated to ${newStatus === 'approved' ? 'Approved' : newStatus} by the Administrator.`,
        read: false,
        createdAt: serverTimestamp(),
      }).catch(err => console.log('notif failure', err));

    } catch (err: any) {
      onAddToast(`Permission error: ${err.message}`, 'error');
    }
  };

  const handleUpdateRole = async (targetUid: string, targetName: string, newRole: UserProfile['role']) => {
    try {
      await updateDoc(doc(db, 'users', targetUid), {
        role: newRole,
      });
      onAddToast(`Role of ${targetName} assigned as: ${newRole}`, 'success');
      await submitLog('Update User Role', `Admin assigned ${targetName} role to ${newRole}.`);

      // Notify user
      const notifId = crypto.randomUUID();
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        userId: targetUid,
        title: `New Workspace Role Assigned`,
        message: `Admin has assigned you the custom role of: ${newRole.toUpperCase()}.`,
        read: false,
        createdAt: serverTimestamp(),
      }).catch(err => console.log('notif failure', err));

    } catch (err: any) {
      onAddToast(`Error updates: ${err.message}`, 'error');
    }
  };

  const handleDeleteUser = async (targetUid: string, targetName: string) => {
    if (!window.confirm(`Are you absolutely sure you want to delete profile: ${targetName}?`)) return;
    try {
      await deleteDoc(doc(db, 'users', targetUid));
      onAddToast(`Deleted user account: ${targetName}`, 'info');
      await submitLog('Delete User profile', `Admin deleted profile of ${targetName} (${targetUid}).`);
    } catch (err: any) {
      onAddToast(`Deletion failed: ${err.message}`, 'error');
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      onAddToast('Please enter both title and message.', 'warning');
      return;
    }
    setSendingNotif(true);

    try {
      const targets = notifTarget === 'all'
        ? users.filter(u => u.approvalStatus === 'approved')
        : [users.find(u => u.uid === notifTarget)].filter(Boolean) as UserProfile[];

      for (const target of targets) {
        const id = crypto.randomUUID();
        await setDoc(doc(db, 'notifications', id), {
          id,
          userId: target.uid,
          title: notifTitle.trim(),
          message: notifMessage.trim(),
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      onAddToast(`Notification successfully delivered to ${targets.length} users!`, 'success');
      await submitLog('Publish Notification', `Broadcasting notification: "${notifTitle.trim()}"`);
      setNotifTitle('');
      setNotifMessage('');
    } catch (err: any) {
      onAddToast(`Failed delivering notify alerts: ${err.message}`, 'error');
    } finally {
      setSendingNotif(false);
    }
  };

  // Standard stats derivations
  const totalUsersCount = users.length;
  const waitingApprovalCount = users.filter(u => u.approvalStatus === 'Waiting for Approval').length;
  const activeSponsorsCount = users.filter(u => u.role === 'sponsor' && u.approvalStatus === 'approved').length;
  const activeManagersCount = users.filter(u => u.role === 'manager' && u.approvalStatus === 'approved').length;
  const totalPackestIssued = packets.length;
  const totalCoinsDistributed = packets
    .filter(p => p.status === 'Given')
    .reduce((sum, p) => sum + p.amount, 0);

  // Filters logic
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.approvalStatus === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const filteredLogs = logs.filter((l) => {
    return (
      l.userName.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.action.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.details.toLowerCase().includes(logSearch.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row font-sans">
      
      {/* 1. Sidebar Nav */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-100 flex flex-col md:fixed md:h-full z-10">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">RP</span>
          </div>
          <div>
            <h2 className="text-white font-bold tracking-tight text-lg leading-none">PacketCloud</h2>
            <span className="text-[10px] text-red-400 font-mono tracking-wider uppercase font-semibold">Admin Panel</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'users'
                ? 'bg-red-500/10 border-l-4 border-red-500 text-red-400 font-medium rounded-r-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
            }`}
          >
            <Users className="w-5 h-5 text-current" />
            User Management
          </button>

          <button
            onClick={() => setActiveTab('packets')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'packets'
                ? 'bg-red-500/10 border-l-4 border-red-500 text-red-400 font-medium rounded-r-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
            }`}
          >
            <Coins className="w-5 h-5 text-current" />
            Packets Audit
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'logs'
                ? 'bg-red-500/10 border-l-4 border-red-500 text-red-400 font-medium rounded-r-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
            }`}
          >
            <ListCollapse className="w-5 h-5 text-current" />
            System Audit Logs
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'notifications'
                ? 'bg-red-500/10 border-l-4 border-red-500 text-red-400 font-medium rounded-r-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
            }`}
          >
            <BellRing className="w-5 h-5 text-current" />
            Notifications hub
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/30">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 bg-slate-705 rounded-full flex items-center justify-center border-2 border-red-500 bg-slate-700">
              <span className="text-white text-xs font-bold">19</span>
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{userProfile?.name || 'Owner / Admin'}</p>
              <p className="text-[10px] text-slate-500 font-mono truncate uppercase tracking-wider">System Owner</p>
            </div>
          </div>
          <button
            onClick={logoutUser}
            className="w-full py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-lg border border-slate-800 transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* 2. Main Workspace */}
      <main className="flex-1 md:pl-64 p-6 md:p-8 bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100">
        
        {/* Header toolbar */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <span>Security Hub</span>
              <span>•</span>
              <span className="text-red-500 font-bold font-mono">Live Sync</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-905 dark:text-white">Admin Control Center</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-mono border border-slate-200 dark:border-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-red-500" />
              Primary Secure DB
            </span>
          </div>
        </header>

        {/* 3. Statistics row */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider block">Total Users</span>
            <div className="flex items-end justify-between mt-2">
              <span className="text-3xl font-bold">{totalUsersCount}</span>
              <span className="text-green-500 text-xs font-medium">Synced</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider block">Pending Approval</span>
            <div className="flex items-end justify-between mt-2">
              <span className="text-3xl font-bold text-orange-500">{waitingApprovalCount}</span>
              {waitingApprovalCount > 0 && (
                <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-bold rounded">URGENT</span>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider block">Active Sponsors</span>
            <div className="flex items-end justify-between mt-2">
              <span className="text-3xl font-bold text-blue-500">{activeSponsorsCount}</span>
              <span className="text-slate-400 text-xs">Sponsor Tier</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider block">Active Managers</span>
            <div className="flex items-end justify-between mt-2">
              <span className="text-3xl font-bold text-purple-500">{activeManagersCount}</span>
              <span className="text-slate-400 text-xs">Manager Tier</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider block">Coins Distributed</span>
            <div className="flex items-end justify-between mt-2">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{(totalCoinsDistributed / 1000000).toFixed(1)}M</span>
              <span className="text-slate-405 text-xs">Coins</span>
            </div>
          </div>
        </section>

        {/* 4. Tab Interfaces */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-md animate-fade-in">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Workspace User Registry</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Authorize accounts, assign structural roles, or suspend accesses.
                </p>
              </div>

              {/* Filters toolbar */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <div className="relative flex-1 lg:flex-none">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search name or WePlay ID..."
                    className="w-full pl-9 pr-4 py-2 text-sm bg-slate-55 dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-250 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>

                <select
                  className="px-3 py-2 text-xs font-semibold bg-slate-55 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="all">All Roles</option>
                  <option value="pending">Pending</option>
                  <option value="sponsor">Sponsor</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>

                <select
                  className="px-3 py-2 text-xs font-semibold bg-slate-55 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="Waiting for Approval">Waiting for Approval</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
              <table className="w-full border-collapse text-left text-sm text-slate-500 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-350 text-xs font-bold uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-4">User Info</th>
                    <th scope="col" className="px-6 py-4">Registered On</th>
                    <th scope="col" className="px-6 py-4 text-center">Assigned Role</th>
                    <th scope="col" className="px-6 py-4 text-center">Approval Status</th>
                    <th scope="col" className="px-6 py-4 text-right">Access Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        <Inbox className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        No users match the selected query criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isSelf = user.uid === userProfile?.uid;
                      const isOwnerOverride = user.email === 'admin_19122007@redpacket.system';

                      // Badge definitions
                      const statusColor = {
                        'approved': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400',
                        'Waiting for Approval': 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400',
                        'rejected': 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400',
                        'suspended': 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
                      }[user.approvalStatus] || 'bg-slate-100 text-slate-800';

                      const roleColor = {
                        'admin': 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400',
                        'manager': 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400',
                        'sponsor': 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400',
                        'pending': 'bg-slate-100 text-slate-600 dark:bg-slate-950 dark:text-slate-400 border border-slate-200 dark:border-slate-800',
                      }[user.role] || 'bg-slate-100 text-slate-800';

                      return (
                        <tr key={user.uid} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-slate-900 dark:text-white font-bold text-sm flex items-center gap-1.5">
                                {user.name}
                                {isSelf && (
                                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-405">
                                    YOU
                                  </span>
                                )}
                              </span>
                              <span className="text-xs text-slate-400 select-all font-mono">
                                {user.email && user.email.endsWith('@weplay.system')
                                  ? `WePlay ID: ${user.email.replace('@weplay.system', '')}`
                                  : user.email === 'admin_19122007@redpacket.system'
                                  ? 'Owner ID: 19122007'
                                  : user.email || 'No email'}
                              </span>
                              <span className="text-[10px] text-slate-405 font-mono">UID: {user.uid}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                            {user.createdAt?.seconds
                              ? new Date(user.createdAt.seconds * 1000).toLocaleString()
                              : 'Just Now'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {isOwnerOverride ? (
                              <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-200 text-rose-900 dark:bg-rose-950 dark:text-rose-350">
                                system admin
                              </span>
                            ) : (
                              <div className="flex flex-col items-center gap-1.5">
                                <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full uppercase ${roleColor}`}>
                                  {user.role}
                                </span>
                                <select
                                  disabled={isSelf || isOwnerOverride}
                                  className="text-[11px] font-bold px-1.5 py-0.5 rounded border border-slate-205 dark:border-slate-850 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none"
                                  value={user.role}
                                  onChange={(e) => handleUpdateRole(user.uid, user.name, e.target.value as UserProfile['role'])}
                                >
                                  <option value="pending">Pending</option>
                                  <option value="sponsor">Sponsor</option>
                                  <option value="manager">Manager</option>
                                  <option value="admin">Admin</option>
                                </select>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                                {user.approvalStatus}
                              </span>
                              
                              {!isOwnerOverride && !isSelf && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleUpdateStatus(user.uid, user.name, 'approved')}
                                    className="p-1 rounded bg-emerald-50 dark:bg-emerald-955/30 border border-emerald-250 dark:border-emerald-800/40 text-emerald-650 hover:bg-emerald-100 transition-colors"
                                    title="Approve User"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(user.uid, user.name, 'rejected')}
                                    className="p-1 rounded bg-rose-50 dark:bg-rose-955/30 border border-rose-250 dark:border-rose-800/40 text-rose-650 hover:bg-rose-100 transition-colors"
                                    title="Reject User"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(user.uid, user.name, 'suspended')}
                                    className="p-1 rounded bg-slate-100 dark:bg-slate-855 border border-slate-250 dark:border-slate-800 text-slate-650 hover:bg-slate-200 transition-colors"
                                    title="Suspend User"
                                  >
                                    <AlertOctagon className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {!isOwnerOverride && !isSelf && (
                                <>
                                  <button
                                    onClick={() => handleDeleteUser(user.uid, user.name)}
                                    className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/30 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                                  >
                                    <UserMinus className="w-3.5 h-3.5" />
                                    Purge
                                  </button>
                                </>
                              )}
                              {isOwnerOverride && (
                                <span className="text-[11px] text-slate-400 font-mono italic">
                                  Immutable System Account
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'packets' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-md animate-fade-in animate-duration-300">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Red Packets Audit ledger</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Global repository of packets current statuses, balances, and assignments.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
              <table className="w-full border-collapse text-left text-sm text-slate-500 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-350 text-xs font-bold uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-4">Packet Type/Coins</th>
                    <th scope="col" className="px-6 py-4">Sponsor/Holder</th>
                    <th scope="col" className="px-6 py-4 text-center">Status</th>
                    <th scope="col" className="px-6 py-4">Assigned Creator</th>
                    <th scope="col" className="px-6 py-4">Notes / Comments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {packets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        <Inbox className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        No red packets have been issued by sponsors or managers yet.
                      </td>
                    </tr>
                  ) : (
                    packets.map((p) => {
                      const typeColors = {
                        'Given': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-250',
                        'Pending': 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-250',
                        'Sharing Soon': 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-250'
                      }[p.status] || 'bg-slate-100 text-slate-800';

                      return (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-slate-900 dark:text-white font-bold text-sm">
                                {p.type}
                              </span>
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                +{p.amount.toLocaleString()} Coins
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm text-slate-900 dark:text-slate-100">{p.sponsorName}</span>
                              <span className="text-[10px] text-slate-405 font-mono">UID: {p.sponsorId}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${typeColors}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                            {p.assignedBy || 'Admin Override'}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300 italic max-w-xs truncate" title={p.notes}>
                            {p.notes || '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-md animate-fade-in">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Operational Audit Logs</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Verified system transactions logged chronologically.
                </p>
              </div>

              <div className="relative w-full lg:w-72">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Filter logs by keyword..."
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-55 dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-[500px] border border-slate-100 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-55" />
                  No system logs available.
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/10 transition-colors flex items-start gap-4">
                    <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap justify-between items-center gap-1">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {log.action}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {log.createdAt?.seconds
                            ? new Date(log.createdAt.seconds * 1000).toLocaleString()
                            : 'Just Now'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-350 mt-1 select-all break-all">{log.details}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-500">
                          {log.userName} ({log.userRole})
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">User ID: {log.userId}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6 animate-fade-in">
            {/* Form to send notification */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-md">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">In-App Notification Dispatcher</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-medium">
                Deliver alerts, announcements or instructions to users instantly using Firebase streams.
              </p>

              <form onSubmit={handleSendNotification} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-slate-705 dark:text-slate-300 text-xs font-semibold uppercase mb-1.5">
                    Target Recipient
                  </label>
                  <select
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-205 dark:border-slate-800 rounded-xl focus:outline-none"
                    value={notifTarget}
                    onChange={(e) => setNotifTarget(e.target.value)}
                  >
                    <option value="all">Broadcast to All Approved Users</option>
                    {users
                      .filter((u) => u.approvalStatus === 'approved')
                      .map((u) => (
                        <option key={u.uid} value={u.uid}>
                          User: {u.name} ({u.email && u.email.endsWith('@weplay.system') ? `WePlay ID: ${u.email.replace('@weplay.system', '')}` : u.email === 'admin_19122007@redpacket.system' ? 'Owner ID: 19122007' : u.email})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-705 dark:text-slate-300 text-xs font-semibold uppercase mb-1.5">
                    Notification header Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Allocation Completed"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-205 dark:border-slate-800 rounded-xl focus:outline-none"
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-slate-705 dark:text-slate-300 text-xs font-semibold uppercase mb-1.5">
                    Message Body
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide specific guidelines or announcements..."
                    className="w-full px-4 py-2 bg-slate-55 dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-205 dark:border-slate-800 rounded-xl focus:outline-none"
                    value={notifMessage}
                    onChange={(e) => setNotifMessage(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingNotif}
                  className="px-6 py-2.5 bg-red-650 hover:bg-red-750 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {sendingNotif ? 'Distributing alerts...' : 'Publish Notification'}
                </button>
              </form>
            </div>

            {/* Past notifications log */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-md">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">
                Delivered alerts journal
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 select-none">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 italic">No alerts dispatched yet.</p>
                ) : (
                  notifications.map((notif) => {
                    const recipient = users.find(u => u.uid === notif.userId);
                    return (
                      <div key={notif.id} className="py-3 flex justify-between items-start gap-4">
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{notif.title}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{notif.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-mono text-slate-400">
                              Recipient UID: {notif.userId} ({recipient?.name || 'unknown'})
                            </span>
                            <span className="text-[9px] text-slate-400">•</span>
                            <span className="text-[9px] text-slate-400 font-mono">
                              {notif.createdAt?.seconds
                                ? new Date(notif.createdAt.seconds * 1000).toLocaleString()
                                : 'Just Now'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
