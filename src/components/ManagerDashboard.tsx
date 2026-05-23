import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { UserProfile, Invite, Packet, PacketType } from '../types';
import {
  Send,
  PlusCircle,
  Users,
  Inbox,
  LogOut,
  Sparkles,
  BarChart3,
  Coins,
  FileCheck2,
  Trash2,
  TrendingUp,
  Clock
} from 'lucide-react';

interface ManagerDashboardProps {
  onAddToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function ManagerDashboard({ onAddToast }: ManagerDashboardProps) {
  const { userProfile, logoutUser } = useAuth();

  // Unified lists
  const [sponsors, setSponsors] = useState<UserProfile[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [packets, setPackets] = useState<Packet[]>([]);

  // Invite Sponsor inputs
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);

  // Distribute Packet inputs
  // Editing states for Sponsor Data
  const [editingSponsorId, setEditingSponsorId] = useState<string | null>(null);
  const [editTotalInvites, setEditTotalInvites] = useState<number>(0);
  const [editPacketsGiven, setEditPacketsGiven] = useState<number>(0);
  const [editPacketsToBeGiven, setEditPacketsToBeGiven] = useState<number>(0);

  // Mapped object: { [sponsorUid]: coinInputString }
  const [coinInputMap, setCoinInputMap] = useState<Record<string, string>>({});

  const [selectedSponsorId, setSelectedSponsorId] = useState('');
  const [packetType, setPacketType] = useState<PacketType>('600 Coins Red Packet');
  const [packetNotes, setPacketNotes] = useState('');
  const [distributing, setDistributing] = useState(false);

  // Search/Filter states
  const [packetFilter, setPacketFilter] = useState<string>('all');

  // Load Approved Sponsors pool
  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        if (d.role === 'sponsor' && d.approvalStatus === 'approved') {
          list.push({
            uid: d.uid,
            name: d.name,
            email: d.email,
            role: d.role,
            approvalStatus: d.approvalStatus,
            createdAt: d.createdAt,
            totalInvites: d.totalInvites !== undefined ? d.totalInvites : 0,
            redPacketsGiven: d.redPacketsGiven !== undefined ? d.redPacketsGiven : 0,
            redPacketsToBeGiven: d.redPacketsToBeGiven !== undefined ? d.redPacketsToBeGiven : 0,
          });
        }
      });
      setSponsors(list);
    }, (err) => {
      console.error('Sponsors query error:', err);
    });
    return unsubscribe;
  }, []);

  // Subscribe to Sponsor invites list
  useEffect(() => {
    const q = query(collection(db, 'invites'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Invite[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          managerId: d.managerId,
          managerName: d.managerName,
          sponsorEmail: d.sponsorEmail,
          sponsorName: d.sponsorName,
          status: d.status,
          createdAt: d.createdAt,
        });
      });
      setInvites(list);
    }, (err) => {
      console.error('Invites subscriber error:', err);
    });
    return unsubscribe;
  }, []);

  // Subscribe to Packets allocated across system
  useEffect(() => {
    const q = query(collection(db, 'packets'), orderBy('createdAt', 'desc'));
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
      console.error('Packets subscriber error:', err);
    });
    return unsubscribe;
  }, []);

  // Activity audit helper
  const submitLog = async (action: string, details: string) => {
    try {
      const logId = crypto.randomUUID();
      await setDoc(doc(db, 'logs', logId), {
        id: logId,
        userId: userProfile?.uid || 'manager',
        userName: userProfile?.name || 'Manager',
        userRole: 'manager',
        action,
        details,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.log('Error creating log detail:', e);
    }
  };

  // 1. Send / Create Sponsor Invitation
  const handleInviteSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      onAddToast('Please fill out prospective Sponsor details.', 'warning');
      return;
    }
    setSendingInvite(true);

    try {
      const inviteId = crypto.randomUUID();
      const formattedSponsorEmail = inviteEmail.includes('@') ? inviteEmail.trim() : `${inviteEmail.trim()}@weplay.system`;
      await setDoc(doc(db, 'invites', inviteId), {
        id: inviteId,
        managerId: userProfile?.uid || 'manager',
        managerName: userProfile?.name || 'Manager',
        sponsorEmail: formattedSponsorEmail,
        sponsorName: inviteName.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      onAddToast(`Invitation dispatched to: ${inviteName.trim()} (WePlay ID: ${inviteEmail.trim()})`, 'success');
      await submitLog('Create Sponsor Invite', `Manager invited Sponsor: ${inviteName} <${formattedSponsorEmail}>.`);
      setInviteName('');
      setInviteEmail('');
    } catch (err: any) {
      onAddToast(`Process error: ${err.message}`, 'error');
    } finally {
      setSendingInvite(false);
    }
  };

  // 2. Allocate / Distribute Red Packet
  const handleDistributePacket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSponsorId) {
      onAddToast('Please choose an approved Sponsor first.', 'warning');
      return;
    }
    setDistributing(true);

    const targetSponsor = sponsors.find((s) => s.uid === selectedSponsorId);
    if (!targetSponsor) {
      onAddToast('Sponsor details could not be loaded.', 'error');
      setDistributing(false);
      return;
    }

    // Map amounts to standard denominations
    const amountMap = {
      '600 Coins Red Packet': 600,
      '1800 Coins Red Packet': 1800,
      '3000 Coins Red Packet': 3000,
      '10,000 Coins Red Packet': 10000,
    };
    const amount = amountMap[packetType] || 600;

    try {
      const packetId = crypto.randomUUID();
      const packetData: Packet = {
        id: packetId,
        sponsorId: targetSponsor.uid,
        sponsorName: targetSponsor.name,
        type: packetType,
        status: 'Pending',
        amount,
        createdAt: serverTimestamp(),
        assignedBy: userProfile?.name || 'Manager',
        notes: packetNotes.trim(),
      };

      await setDoc(doc(db, 'packets', packetId), packetData);

      // Notify host automatically in app
      const notifId = crypto.randomUUID();
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        userId: targetSponsor.uid,
        title: 'New Red Packet Dispatched',
        message: `Manager ${userProfile?.name} has assigned you a new ${packetType}. State: Pending.`,
        read: false,
        createdAt: serverTimestamp(),
      }).catch(err => console.error('Alert notify failure', err));

      onAddToast(`Packet allocated to ${targetSponsor.name} successfully!`, 'success');
      await submitLog('Issue Red Packet', `Manager issued ${packetType} (+${amount} coins) to Sponsor ${targetSponsor.name}.`);
      setPacketNotes('');
      setSelectedSponsorId('');
    } catch (err: any) {
      onAddToast(`Distribution failed: ${err.message}`, 'error');
    } finally {
      setDistributing(false);
    }
  };

  // 3. Update packet status on behalf of sponsor
  const handleUpdatePacketStatus = async (packetId: string, currentStatus: Packet['status'], newStatus: Packet['status']) => {
    try {
      await updateDoc(doc(db, 'packets', packetId), { status: newStatus });
      onAddToast(`Status changed to ${newStatus}`, 'success');
      await submitLog('Override Packet Status', `Manager override packet ${packetId.slice(0, 8)} state to ${newStatus}.`);
    } catch (err: any) {
      onAddToast(`Update denied: ${err.message}`, 'error');
    }
  };

  // 4. Update Sponsor metrics directly
  const handleUpdateDirectMetrics = async (sponsorId: string, totalInv: number, pktsGiven: number, pktsToBeGiven: number) => {
    try {
      await updateDoc(doc(db, 'users', sponsorId), {
        totalInvites: totalInv,
        redPacketsGiven: pktsGiven,
        redPacketsToBeGiven: pktsToBeGiven
      });
      onAddToast('Sponsor tracked metrics updated successfully.', 'success');
      await submitLog('Update Sponsor Metrics', `Manager adjusted direct metrics for Sponsor ${sponsorId}. Invites: ${totalInv}, Given: ${pktsGiven}, To Be Given: ${pktsToBeGiven}`);
      setEditingSponsorId(null);
    } catch (err: any) {
      onAddToast(`Failed to update metrics: ${err.message}`, 'error');
    }
  };

  // 5. Convert Coins given to Red Packet stats
  const handleDistributeByCoins = async (sponsorId: string, sponsorName: string, coinsStr: string, currentGiven: number, currentToBeGiven: number) => {
    const coins = parseInt(coinsStr, 10);
    if (isNaN(coins) || coins <= 0) {
      onAddToast('Please enter a valid positive number of coins.', 'warning');
      return;
    }

    const rpCount = Math.floor(coins / 600);
    if (rpCount < 1) {
      onAddToast('Minimum coins for 1 Red Packet is 600.', 'warning');
      return;
    }

    try {
      const newGiven = currentGiven + rpCount;
      const newToBeGiven = Math.max(0, currentToBeGiven - rpCount);

      await updateDoc(doc(db, 'users', sponsorId), {
        redPacketsGiven: newGiven,
        redPacketsToBeGiven: newToBeGiven
      });

      setCoinInputMap((prev) => ({ ...prev, [sponsorId]: '' }));

      onAddToast(`Converted ${coins.toLocaleString()} coins into ${rpCount} Red Packets. Added to Given & deducted from To Be Given!`, 'success');
      await submitLog('Convert Coins to Packets', `Manager distributed ${coins} coins (${rpCount} RPs) to Sponsor ${sponsorName}`);
    } catch (err: any) {
      onAddToast(`Conversion update failed: ${err.message}`, 'error');
    }
  };

  // Derived Performance Metrics
  const totalInvitesCount = invites.length;
  const totalAllocatedCoins = packets.reduce((sum, p) => sum + p.amount, 0);
  const activeSponsorsCount = sponsors.length;

  const filteredPackets = packets.filter((p) => {
    if (packetFilter === 'all') return true;
    return p.status === packetFilter;
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
            <span className="text-[10px] text-red-400 font-mono tracking-wider uppercase font-semibold">Manager Hub</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-red-500/10 border-l-4 border-red-500 text-red-400 text-left"
          >
            <BarChart3 className="w-5 h-5 text-current" />
            Control Desk
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/30">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center border-2 border-red-500">
              <span className="text-white text-xs font-bold">MN</span>
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{userProfile?.name || 'Manager User'}</p>
              <p className="text-[10px] text-slate-500 font-mono truncate uppercase tracking-wider">Manager Role</p>
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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Manager Control Area</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-mono border border-slate-200 dark:border-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-red-500" />
              Secure Oversight
            </span>
          </div>
        </header>

        {/* Top welcome overview */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm animate-fade-in animate-duration-300">
          <div>
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider block">Manager Workspace</span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Welcome, {userProfile?.name}!
              <Sparkles className="w-4 h-4 text-red-500" />
            </h2>
            <p className="text-[11px] text-slate-405 font-mono mt-1 select-all">Verified Sponsor Pool: {activeSponsorsCount} Approved</p>
          </div>

          <div className="flex gap-4">
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-405 font-bold uppercase tracking-wide block">Total Invites</span>
              <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">{totalInvitesCount} Issued</span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-455 font-bold uppercase tracking-wide block">Allocated Balance</span>
              <span className="text-sm font-bold font-mono text-red-500">{totalAllocatedCoins.toLocaleString()} Coins</span>
            </div>
          </div>
        </div>

        {/* Action centers: Distribution Forms and Inviter row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* A. Allocate/Distribute Red packet */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-205 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <PlusCircle className="w-5 h-5 text-purple-650" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">Allocate Red Envelope</h3>
              </div>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Deposit red packet denominations into the active custody logs of any approved Sponsor.
              </p>

              <form onSubmit={handleDistributePacket} className="space-y-4">
                <div>
                  <label className="block text-slate-705 text-xs font-semibold uppercase mb-1.5 dark:text-slate-305">
                    Target Approved Sponsor
                  </label>
                  <select
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-900 dark:text-white"
                    value={selectedSponsorId}
                    onChange={(e) => setSelectedSponsorId(e.target.value)}
                    required
                  >
                    <option value="">Select an Approved Sponsor...</option>
                    {sponsors.map((s) => (
                      <option key={s.uid} value={s.uid}>
                        {s.name} ({s.email && s.email.endsWith('@weplay.system') ? `WePlay ID: ${s.email.split('@')[0]}` : s.email})
                      </option>
                    ))}
                  </select>
                  {sponsors.length === 0 && (
                    <p className="text-[10px] text-amber-600 mt-1 font-semibold">
                      ⚠ No approved sponsors available in system. Approve one in Admin user control first.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-705 text-xs font-semibold uppercase mb-1.5 dark:text-slate-305">
                      Envelope Denomination
                    </label>
                    <select
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                      value={packetType}
                      onChange={(e) => setPacketType(e.target.value as PacketType)}
                    >
                      <option value="600 Coins Red Packet">600 Coins Red Packet</option>
                      <option value="1800 Coins Red Packet">1800 Coins Red Packet</option>
                      <option value="3000 Coins Red Packet">3000 Coins Red Packet</option>
                      <option value="10,000 Coins Red Packet">10,000 Coins Red Packet</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-705 text-xs font-semibold uppercase mb-1.5 dark:text-slate-305">
                      Distribution Notes / Instructions
                    </label>
                    <input
                      type="text"
                      placeholder="Comment guidelines..."
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                      value={packetNotes}
                      onChange={(e) => setPacketNotes(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={distributing || sponsors.length === 0}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-755 text-white bg-gradient-to-r hover:from-purple-650 hover:to-indigo-650 rounded-xl text-xs font-bold shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 active:scale-[0.98] transition-all disabled:opacity-40"
                >
                  {distributing ? 'Allocating balance Envelopes...' : 'Issue New Red Packet'}
                </button>
              </form>
            </div>
          </div>

          {/* B. Manage sponsor invites */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-205 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Send className="w-5 h-5 text-purple-650" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">Dispatch Network Invitation</h3>
            </div>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Invite prospective hosts to register as Sponsors. Invited users must await Admin clearance.
            </p>

            <form onSubmit={handleInviteSponsor} className="space-y-4">
              <div>
                <label className="block text-slate-765 text-xs font-semibold uppercase mb-1.5 dark:text-slate-305">Prospective Sponsor Name</label>
                <input
                  type="text"
                  placeholder="Full legal Name"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-990 dark:text-white text-slate-900"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-slate-765 text-xs font-semibold uppercase mb-1.5 dark:text-slate-305">Prospective Sponsor WePlay ID Number</label>
                <input
                  type="text"
                  placeholder="e.g. 19122007"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={sendingInvite}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-705 text-white rounded-xl text-xs font-bold tracking-wider float-right transition-all disabled:opacity-40"
              >
                {sendingInvite ? 'Sending request email...' : 'Send Sponsor Invitation'}
              </button>
            </form>
          </div>

        </div>

        {/* Sponsor Performance Analysis section */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-purple-650" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">Sponsor Data & Performance Manager</h3>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {sponsors.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 col-span-2 text-center">
                No active approved sponsors found.
              </p>
            ) : (
              sponsors.map((sponsor) => {
                const sponsorActivePackets = packets.filter(p => p.sponsorId === sponsor.uid);
                const givenValue = sponsorActivePackets.filter(p => p.status === 'Given').reduce((sum, p) => sum + p.amount, 0);
                const givenCount = sponsorActivePackets.filter(p => p.status === 'Given').length;
                const totalCount = sponsorActivePackets.length;

                const isEditing = editingSponsorId === sponsor.uid;
                const coinInput = coinInputMap[sponsor.uid] || '';
                const coinVal = parseInt(coinInput, 10);
                const calculatedRpCount = !isNaN(coinVal) && coinVal >= 600 ? Math.floor(coinVal / 600) : 0;

                return (
                  <div key={sponsor.uid} className="bg-slate-50 dark:bg-slate-950 p-6 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between gap-6 shadow-sm">
                    {/* Header: Info */}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="font-extrabold text-base text-slate-900 dark:text-white truncate">{sponsor.name}</h4>
                        <p className="text-[11px] text-slate-400 font-mono select-all">
                          {sponsor.email && sponsor.email.endsWith('@weplay.system')
                            ? `WePlay ID: ${sponsor.email.replace('@weplay.system', '')}`
                            : sponsor.email}
                        </p>
                      </div>
                      <span className="text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold px-2 py-1 rounded">
                        Sponsor Active
                      </span>
                    </div>

                    {/* Stats from assigned envelope system */}
                    <div className="grid grid-cols-2 gap-4 py-3 px-4 bg-white dark:bg-slate-905/60 rounded-xl border border-slate-150 dark:border-slate-800">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">System Handed Out</span>
                        <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                          {givenCount} / {totalCount} Envelopes
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">System Released Coins</span>
                        <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          {givenValue.toLocaleString()} Coins
                        </span>
                      </div>
                    </div>

                    {/* Core Tracked Stats Area */}
                    <div className="border-t border-slate-200 dark:border-slate-800/60 pt-4">
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="text-xs font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider">
                          Custom Sponsor Data
                        </h5>
                        {!isEditing && (
                          <button
                            onClick={() => {
                              setEditingSponsorId(sponsor.uid);
                              setEditTotalInvites(sponsor.totalInvites || 0);
                              setEditPacketsGiven(sponsor.redPacketsGiven || 0);
                              setEditPacketsToBeGiven(sponsor.redPacketsToBeGiven || 0);
                            }}
                            className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-extrabold cursor-pointer"
                          >
                            Edit Stats
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-purple-200 dark:border-purple-900/40">
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Total Invites</label>
                              <input
                                type="number"
                                className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-805 rounded font-mono text-xs text-slate-933 dark:text-white"
                                value={editTotalInvites}
                                onChange={(e) => setEditTotalInvites(Math.max(0, parseInt(e.target.value) || 0))}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">RP Given</label>
                              <input
                                type="number"
                                className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-805 rounded font-mono text-xs text-slate-933 dark:text-white"
                                value={editPacketsGiven}
                                onChange={(e) => setEditPacketsGiven(Math.max(0, parseInt(e.target.value) || 0))}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">RP To Be Given</label>
                              <input
                                type="number"
                                className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-805 rounded font-mono text-xs text-slate-933 dark:text-white"
                                value={editPacketsToBeGiven}
                                onChange={(e) => setEditPacketsToBeGiven(Math.max(0, parseInt(e.target.value) || 0))}
                              />
                            </div>
                          </div>
                          
                          <div className="flex justify-end gap-2 text-xs">
                            <button
                              onClick={() => setEditingSponsorId(null)}
                              className="px-3 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 text-[11px] font-bold rounded hover:bg-slate-300 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleUpdateDirectMetrics(sponsor.uid, editTotalInvites, editPacketsGiven, editPacketsToBeGiven)}
                              className="px-3 py-1 bg-purple-650 text-white bg-purple-600 text-[11px] font-bold rounded hover:bg-purple-700 transition-colors cursor-pointer"
                            >
                              Save Stats
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                          <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-150 dark:border-slate-800">
                            <span className="text-[9px] text-slate-400 block uppercase font-sans font-bold">Total Invites</span>
                            <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{sponsor.totalInvites || 0}</span>
                          </div>
                          <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-150 dark:border-slate-800">
                            <span className="text-[9px] text-slate-400 block uppercase font-sans font-bold">RP Given</span>
                            <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">{sponsor.redPacketsGiven || 0}</span>
                          </div>
                          <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-150 dark:border-slate-800">
                            <span className="text-[9px] text-slate-400 block uppercase font-sans font-bold">RP To Be Given</span>
                            <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">{sponsor.redPacketsToBeGiven || 0}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Coins given to Red Packets calculator */}
                    <div className="border-t border-slate-200 dark:border-slate-800/60 pt-4 bg-slate-100/55 dark:bg-slate-900/35 -mx-6 -mb-6 p-6 rounded-b-2xl">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Add Coins Given Calculator
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          pattern="[0-9]*"
                          placeholder="e.g. 600, 3000..."
                          className="flex-1 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-purple-500"
                          value={coinInput}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setCoinInputMap(prev => ({ ...prev, [sponsor.uid]: val }));
                          }}
                        />
                        <button
                          onClick={() => handleDistributeByCoins(
                            sponsor.uid,
                            sponsor.name,
                            coinInput,
                            sponsor.redPacketsGiven || 0,
                            sponsor.redPacketsToBeGiven || 0
                          )}
                          disabled={calculatedRpCount < 1}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                          Send Red Packets
                        </button>
                      </div>

                      {calculatedRpCount > 0 && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-2 animate-fade-in">
                          ✔ Converts into <span className="font-bold underline">{calculatedRpCount} RP</span> (+{calculatedRpCount} RP Given, -{calculatedRpCount} RP To Be Given)
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Global envelopes distribution log list */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-purple-650" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">Envelope audit desk</h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold dark:text-slate-300">Filter Status:</span>
              <select
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                value={packetFilter}
                onChange={(e) => setPacketFilter(e.target.value)}
              >
                <option value="all">All States</option>
                <option value="Pending">Pending</option>
                <option value="Giving Soon">Sharing Soon</option>
                <option value="Given">Given</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 dark:border-slate-840 rounded-xl">
            <table className="w-full border-collapse text-left text-sm text-slate-405">
              <thead className="bg-slate-52 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wide">
                <tr>
                  <th scope="col" className="px-6 py-4">Packet Denomination</th>
                  <th scope="col" className="px-6 py-4">Sponsor/Holder</th>
                  <th scope="col" className="px-6 py-4">State</th>
                  <th scope="col" className="px-6 py-4">Change Status Override</th>
                  <th scope="col" className="px-6 py-4">Guidelines Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                {filteredPackets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                      <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No matching red envelopes registered inside logs.
                    </td>
                  </tr>
                ) : (
                  filteredPackets.map((p) => {
                    const statusColor = {
                      'Given': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-250',
                      'Pending': 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-250',
                      'Sharing Soon': 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-250'
                    }[p.status] || 'bg-slate-100';

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-slate-900 dark:text-white font-extrabold text-sm">{p.type}</span>
                            <span className="text-[10px] text-slate-400 select-all font-mono">UID: {p.id.slice(0, 16)}...</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-slate-900 dark:text-white text-sm">{p.sponsorName}</span>
                            <span className="text-[9px] text-slate-400 select-all font-mono">UID: {p.sponsorId}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            className="bg-white dark:bg-slate-950 border border-slate-205 dark:border-slate-800 text-xs px-2.5 py-1 rounded outline-none font-semibold text-slate-800 dark:text-slate-250"
                            value={p.status}
                            onChange={(e) => handleUpdatePacketStatus(p.id, p.status, e.target.value as Packet['status'])}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Sharing Soon">Sharing Soon</option>
                            <option value="Given">Given</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-xs select-all text-slate-500 max-w-xs truncate italic" title={p.notes}>
                          {p.notes || '—'}
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
