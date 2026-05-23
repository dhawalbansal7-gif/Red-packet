import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { Packet, Notification } from '../types';
import {
  Coins,
  History,
  TrendingUp,
  Inbox,
  LogOut,
  Bell,
  Clock,
  Sparkles,
  Award,
  BookOpen,
  ArrowRight
} from 'lucide-react';

interface SponsorDashboardProps {
  onAddToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function SponsorDashboard({ onAddToast }: SponsorDashboardProps) {
  const { userProfile, logoutUser } = useAuth();
  const [packets, setPackets] = useState<Packet[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Subscribe to packets assigned to this sponsor
  useEffect(() => {
    if (!userProfile?.uid) return;
    const q = query(
      collection(db, 'packets'),
      where('sponsorId', '==', userProfile.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Packet[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: d.id,
          sponsorId: d.sponsorId,
          sponsorName: d.sponsorName,
          type: d.type,
          status: d.status,
          amount: d.amount,
          createdAt: d.createdAt,
          assignedBy: d.assignedBy,
          notes: d.notes,
        });
      });
      setPackets(list);
    }, (err) => {
      console.error("Packets subscribe error for Sponsor:", err);
    });

    return unsubscribe;
  }, [userProfile?.uid]);

  // Subscribe to notifications for this sponsor
  useEffect(() => {
    if (!userProfile?.uid) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userProfile.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Notification[] = [];
      let unread = 0;
      snapshot.forEach((doc) => {
        const d = doc.data();
        const notificationItem: Notification = {
          id: doc.id,
          userId: d.userId,
          title: d.title,
          message: d.message,
          read: d.read,
          createdAt: d.createdAt,
        };
        list.push(notificationItem);
        if (!d.read) unread++;
      });
      setNotifications(list);
      setUnreadCount(unread);
    }, (err) => {
      console.error("Notifications subscribe error for Sponsor:", err);
    });

    return unsubscribe;
  }, [userProfile?.uid]);

  // Log sponsor activity
  const submitLog = async (action: string, details: string) => {
    try {
      const logId = crypto.randomUUID();
      await setDoc(doc(db, 'logs', logId), {
        id: logId,
        userId: userProfile?.uid || 'sponsor',
        userName: userProfile?.name || 'Sponsor',
        userRole: 'sponsor',
        action,
        details,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.log('Error creating log', e);
    }
  };

  // Update envelope status
  const handleUpdateStatus = async (packetId: string, newStatus: Packet['status']) => {
    try {
      const packetRefer = doc(db, 'packets', packetId);
      await updateDoc(packetRefer, { status: newStatus });
      onAddToast(`Status updated successfully to: ${newStatus}`, 'success');
      await submitLog('Update Packet Status', `Sponsor ${userProfile?.name} changed packet ID ${packetId.slice(0, 8)} status to ${newStatus}.`);
    } catch (err: any) {
      onAddToast(`Error updating status: ${err.message}`, 'error');
    }
  };

  // Mark all notifications as read
  const handleMarkNotificationsRead = async () => {
    try {
      for (const n of notifications) {
        if (!n.read) {
          await updateDoc(doc(db, 'notifications', n.id), { read: true });
        }
      }
      setShowNotifications(false);
    } catch (err: any) {
      console.error('Mark read failed:', err);
    }
  };

  // Derived metrics
  const totalPacketsShared = packets.filter(p => p.status === 'Given').length;
  const totalAmountShared = packets
    .filter(p => p.status === 'Given')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingPacketsCount = packets.filter(p => p.status === 'Pending').length;
  const sharingSoonCount = packets.filter(p => p.status === 'Sharing Soon').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row font-sans">
      
      {/* Left Sidebar Nav */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-100 flex flex-col md:fixed md:h-full z-10">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">RP</span>
          </div>
          <div>
            <h2 className="text-white font-bold tracking-tight text-lg leading-none">PacketCloud</h2>
            <span className="text-[10px] text-red-400 font-mono tracking-wider uppercase font-semibold">Sponsor Hub</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-red-500/10 border-l-4 border-red-500 text-red-400 transition-all text-left"
          >
            <Coins className="w-5 h-5 text-current" />
            Active Envelopes
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/30">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center border-2 border-red-500">
              <span className="text-white text-xs font-bold">SP</span>
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{userProfile?.name || 'Sponsor User'}</p>
              <p className="text-[10px] text-slate-505 font-mono truncate uppercase tracking-wider">Sponsor Role</p>
            </div>
          </div>
          <button
            onClick={logoutUser}
            className="w-full py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-lg border border-slate-800 transition-colors cursor-pointer"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Right Workspace Area */}
      <main className="flex-1 md:pl-64 p-6 md:p-8 bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100">
        
        {/* Header toolbar */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <span>Sponsor Panel</span>
              <span>•</span>
              <span className="text-red-550 font-bold font-mono">Live Client</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Active Allocation Registry</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification bell dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-all shadow-sm relative cursor-pointer"
                aria-label="Toggle notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-[9px] font-bold text-white rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification drop list */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-300">System Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkNotificationsRead}
                        className="text-[10px] text-red-500 hover:underline font-semibold cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 p-4 text-center">No alerts in inbox.</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-3 text-left hover:bg-slate-5 transition-all relative ${!n.read ? 'bg-red-50/10 dark:bg-red-950/10' : ''}`}>
                          {!n.read && <span className="absolute left-1.5 top-4 w-1.5 h-1.5 bg-red-500 rounded-full" />}
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 pl-1.5">{n.title}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-450 mt-0.5 pl-1.5">{n.message}</p>
                          <span className="text-[9px] text-slate-400 block mt-1 pl-1.5 font-mono">
                            {n.createdAt?.seconds ? new Date(n.createdAt.seconds * 1000).toLocaleTimeString() : 'Just Now'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-mono border border-slate-200 dark:border-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-red-500" />
              Sponsor Network
            </span>
          </div>
        </header>

        {/* Profile Card Summary Banner */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm animate-fade-in animate-duration-300">
          <div>
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider block">Sponsor Profile</span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Welcome, {userProfile?.name}!
              <Award className="w-4 h-4 text-red-500" />
            </h2>
            <p className="text-[11px] text-slate-400 font-mono mt-1 select-all">Sponsor ID: {userProfile?.uid}</p>
          </div>

          <div className="flex gap-4">
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide block">Total Exchanged</span>
              <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">{totalPacketsShared} Red Envelopes</span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide block">Shared Volume</span>
              <span className="text-base font-bold font-mono text-red-500">{totalAmountShared.toLocaleString()} Coins</span>
            </div>
          </div>
        </div>

        {/* Sponsor Custom Tracked Data (Managed by Manager) */}
        <div className="bg-slate-900 text-white rounded-2xl border border-red-900/50 p-6 mb-8 shadow-md">
          <h3 className="text-sm font-bold tracking-wider uppercase text-red-400 mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Sponsor Tracked Data (Manager Managed)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-4">
              <span className="text-xs font-bold uppercase text-slate-400 block mb-1">Total Invites</span>
              <span className="text-2xl font-black font-mono text-white">
                {userProfile?.totalInvites !== undefined ? userProfile.totalInvites : 0}
              </span>
            </div>
            <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-4">
              <span className="text-xs font-bold uppercase text-slate-400 block mb-1">Red Packets Given</span>
              <span className="text-2xl font-black font-mono text-emerald-400">
                {userProfile?.redPacketsGiven !== undefined ? userProfile.redPacketsGiven : 0}
              </span>
            </div>
            <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-4">
              <span className="text-xs font-bold uppercase text-slate-400 block mb-1">Red Packets to be Given</span>
              <span className="text-2xl font-black font-mono text-amber-400">
                {userProfile?.redPacketsToBeGiven !== undefined ? userProfile.redPacketsToBeGiven : 0}
              </span>
            </div>
          </div>
        </div>

        {/* Dashboard grid metrics cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-in animate-duration-300">
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm text-center">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase block">Pending distribution</span>
            <span className="text-xl font-bold font-mono text-amber-500 block mt-1">{pendingPacketsCount} Packets</span>
          </div>
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm text-center">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase block">Sharing Soon</span>
            <span className="text-xl font-bold font-mono text-blue-500 block mt-1">{sharingSoonCount} Packets</span>
          </div>
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm text-center">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase block">Finished Transfer</span>
            <span className="text-xl font-bold font-mono text-emerald-500 block mt-1">{totalPacketsShared} Packets</span>
          </div>
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm text-center">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase block">Global allocation</span>
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-white block mt-1">{packets.length} Packets</span>
          </div>
        </section>

        {/* Active Envelopes Registry Workspace */}
        <section className="mb-12 animate-fade-in animate-duration-350">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Red Envelopes</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">Update transfer states as you distribute them to owners.</p>
            </div>
            <Sparkles className="w-5 h-5 text-red-500" />
          </div>

          {packets.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <Inbox className="w-12 h-12 mx-auto mb-3 opacity-60 text-slate-400" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">Your Envelope Vault is Empty</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                A System Manager or Administrator must assign envelopes to your Sponsor ID before they are shown here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {packets.map((packet) => {
                const isGiven = packet.status === 'Given';
                const isPending = packet.status === 'Pending';
                const isSharingSoon = packet.status === 'Sharing Soon';

                const statusBg = {
                  'Given': 'bg-emerald-500 text-white',
                  'Pending': 'bg-amber-500 text-white',
                  'Sharing Soon': 'bg-blue-500 text-white',
                }[packet.status] || 'bg-slate-500 text-white';

                return (
                  <div
                    key={packet.id}
                    className="relative bg-gradient-to-b from-red-500 to-red-600 text-white rounded-2xl border border-red-600 shadow-md hover:shadow-red-500/10 hover:shadow-lg transition-all overflow-hidden flex flex-col p-6 animate-slide-in group"
                  >
                    {/* Coin design elements */}
                    <div className="absolute right-3 top-3 opacity-15 text-white/50 pointer-events-none group-hover:scale-110 transition-transform">
                      <Coins className="w-20 h-20" />
                    </div>

                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBg}`}>
                        {packet.status}
                      </span>
                      <span className="text-[10px] text-amber-200 font-semibold font-mono tracking-wider bg-red-700/40 px-2 py-1 rounded">
                        {packet.amount.toLocaleString()} Coins
                      </span>
                    </div>

                    <div className="flex-1 min-h-[80px]">
                      <h4 className="text-lg font-extrabold tracking-wide drop-shadow-sm mb-1">
                        {packet.type}
                      </h4>
                      <p className="text-[10px] text-red-200 select-all font-mono mb-2">ID: {packet.id.slice(0, 16)}...</p>
                      {packet.notes && (
                        <p className="text-xs text-red-100 bg-red-700/45 rounded p-2.5 leading-relaxed italic border border-red-600/40">
                          {packet.notes}
                        </p>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/20 flex flex-col gap-2">
                      <span className="text-[10px] text-red-100 font-semibold uppercase tracking-wider mb-1 block">Toggle Release State:</span>
                      
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        <button
                          onClick={() => handleUpdateStatus(packet.id, 'Pending')}
                          className={`py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            isPending
                              ? 'bg-amber-500 text-white font-black'
                              : 'bg-red-800/40 text-red-100 hover:bg-neutral-900/20'
                          }`}
                        >
                          Pending
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(packet.id, 'Sharing Soon')}
                          className={`py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            isSharingSoon
                              ? 'bg-blue-500 text-white font-black'
                              : 'bg-red-800/40 text-red-100 hover:bg-neutral-900/20'
                          }`}
                        >
                          Soon
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(packet.id, 'Given')}
                          className={`py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            isGiven
                              ? 'bg-emerald-500 text-white font-black'
                              : 'bg-red-800/40 text-red-100 hover:bg-neutral-900/20'
                          }`}
                        >
                          Given
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Sponsor Ledger Section */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm animate-fade-in animate-duration-400">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-4 h-4 text-red-500" />
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Allocation & History Ledger
            </h3>
          </div>

          <div className="overflow-x-auto border border-slate-100 dark:border-slate-850 rounded-xl">
            <table className="w-full border-collapse text-left text-sm text-slate-500">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Red Pocket Description</th>
                  <th className="px-6 py-4">Total Value</th>
                  <th className="px-6 py-4">Allocated Creator</th>
                  <th className="px-6 py-4">Status Class</th>
                  <th className="px-6 py-4 text-right">Created Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                {packets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  packets.map((p) => {
                    const statusColor = {
                      'Given': 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200',
                      'Pending': 'text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200',
                      'Sharing Soon': 'text-sky-600 bg-sky-50 dark:bg-sky-950/20 dark:text-sky-400 border border-sky-200',
                    }[p.status] || 'text-slate-600 bg-slate-50';

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="px-6 py-4 text-slate-900 dark:text-white font-bold">{p.type}</td>
                        <td className="px-6 py-4 text-red-500 font-mono font-bold">
                          +{p.amount.toLocaleString()} Coins
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">{p.assignedBy || 'Admin System'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs text-right">
                          {p.createdAt?.seconds ? new Date(p.createdAt.seconds * 1000).toLocaleString() : 'Just Now'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
