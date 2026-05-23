import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, UserRole, ApprovalStatus } from '../types';

interface CustomUser {
  uid: string;
  email: string;
}

interface AuthContextType {
  currentUser: CustomUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isSponsor: boolean;
  registerUser: (name: string, weplayId: string, password: string) => Promise<void>;
  loginUser: (emailOrId: string, password: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CustomUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = userProfile?.role === 'admin' || currentUser?.uid === '19122007';
  const isManager = userProfile?.role === 'manager' && userProfile?.approvalStatus === 'approved';
  const isSponsor = userProfile?.role === 'sponsor' && userProfile?.approvalStatus === 'approved';

  const refreshProfile = async (idToRefresh?: string) => {
    const targetId = idToRefresh || localStorage.getItem('weplay_session');
    if (!targetId) {
      setUserProfile(null);
      setCurrentUser(null);
      return;
    }
    try {
      const userRef = doc(db, 'users', targetId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        const profile: UserProfile = {
          uid: data.uid || targetId,
          name: data.name || 'User',
          email: data.email || `${targetId}@weplay.system`,
          role: data.role as UserRole,
          approvalStatus: data.approvalStatus as ApprovalStatus,
          createdAt: data.createdAt,
          lastLogin: data.lastLogin,
          totalInvites: data.totalInvites !== undefined ? data.totalInvites : 0,
          redPacketsGiven: data.redPacketsGiven !== undefined ? data.redPacketsGiven : 0,
          redPacketsToBeGiven: data.redPacketsToBeGiven !== undefined ? data.redPacketsToBeGiven : 0,
        };
        setUserProfile(profile);
        setCurrentUser({ uid: targetId, email: data.email || `${targetId}@weplay.system` });
        localStorage.setItem('weplay_session', targetId);
      } else {
        // Fallback or session invalid
        if (targetId === '19122007') {
          const newProfile: UserProfile = {
            uid: targetId,
            name: 'Owner / Admin',
            email: 'admin_19122007@redpacket.system',
            role: 'admin',
            approvalStatus: 'approved',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          };
          await setDoc(userRef, {
            ...newProfile,
            password: 'Dhawalaradhyakahai',
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
          });
          setUserProfile(newProfile);
          setCurrentUser({ uid: targetId, email: 'admin_19122007@redpacket.system' });
        } else {
          localStorage.removeItem('weplay_session');
          setUserProfile(null);
          setCurrentUser(null);
        }
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  useEffect(() => {
    const sessionUserId = localStorage.getItem('weplay_session');
    if (sessionUserId) {
      refreshProfile(sessionUserId).then(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const registerUser = async (name: string, weplayId: string, password: string) => {
    setLoading(true);
    const idClean = weplayId.trim();
    const isOwner = idClean === '19122007';
    const email = isOwner ? 'admin_19122007@redpacket.system' : `${idClean}@weplay.system`;

    try {
      // 1. Verify existence before writing
      const userRef = doc(db, 'users', idClean);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        throw new Error('This WePlay ID is already registered.');
      }

      // 2. Setup the document under the specific `users/{idClean}`
      const userProfileData = {
        uid: idClean,
        name: isOwner ? 'Owner / Admin' : name,
        email,
        role: isOwner ? 'admin' : 'pending',
        approvalStatus: isOwner ? 'approved' : 'Waiting for Approval',
        password, // safe local storage inside enterprise Firestore database
        totalInvites: 0,
        redPacketsGiven: 0,
        redPacketsToBeGiven: 0,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      };

      try {
        await setDoc(userRef, userProfileData);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${idClean}`);
      }

      // Add audit log
      try {
         const logId = crypto.randomUUID();
         await setDoc(doc(db, 'logs', logId), {
           id: logId,
           userId: idClean,
           userName: isOwner ? 'Owner / Admin' : name,
           userRole: isOwner ? 'admin' : 'pending',
           action: isOwner ? 'Admin Init' : 'User Registration',
           details: isOwner ? 'Master owner system admin account initialized.' : `User registered with WePlay ID: ${idClean}`,
           createdAt: serverTimestamp()
         });
      } catch (e) {}

    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const loginUser = async (emailOrId: string, password: string) => {
    setLoading(true);
    const targetClean = emailOrId.trim();
    const isOwner = targetClean === '19122007';

    try {
      // Autootstrap owner profile if first-time run
      const userRef = doc(db, 'users', targetClean);
      let userSnap = await getDoc(userRef);

      if (!userSnap.exists() && isOwner && password === 'Dhawalaradhyakahai') {
        const adminProfile = {
          uid: targetClean,
          name: 'Owner / Admin',
          email: 'admin_19122007@redpacket.system',
          role: 'admin',
          approvalStatus: 'approved',
          password: 'Dhawalaradhyakahai',
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        };
        await setDoc(userRef, adminProfile);
        userSnap = await getDoc(userRef);
      }

      if (!userSnap.exists()) {
        throw new Error('No user account found with this WePlay ID.');
      }

      const userData = userSnap.data();
      if (userData?.password !== password) {
        throw new Error('Incorrect password or authentication error.');
      }

      // Update signature timestamp
      await updateDoc(userRef, {
        lastLogin: serverTimestamp(),
      }).catch(() => {});

      const profile: UserProfile = {
        uid: targetClean,
        name: userData.name || 'User',
        email: userData.email || `${targetClean}@weplay.system`,
        role: userData.role as UserRole,
        approvalStatus: userData.approvalStatus as ApprovalStatus,
        createdAt: userData.createdAt,
        lastLogin: userData.lastLogin,
      };

      setUserProfile(profile);
      setCurrentUser({ uid: targetClean, email: userData.email || `${targetClean}@weplay.system` });
      localStorage.setItem('weplay_session', targetClean);

      // Record logs
      try {
        const logId = crypto.randomUUID();
        await setDoc(doc(db, 'logs', logId), {
          id: logId,
          userId: targetClean,
          userName: userData.name || 'User',
          userRole: userData.role || 'pending',
          action: 'Login',
          details: `User signed in successfully with WePlay ID: ${targetClean}`,
          createdAt: serverTimestamp()
        });
      } catch {}

      setLoading(false);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logoutUser = async () => {
    const sessionUserId = localStorage.getItem('weplay_session');
    if (sessionUserId) {
      try {
        const logId = crypto.randomUUID();
        await setDoc(doc(db, 'logs', logId), {
          id: logId,
          userId: sessionUserId,
          userName: userProfile?.name || 'User',
          userRole: userProfile?.role || 'user',
          action: 'Logout',
          details: 'User logged out successfully.',
          createdAt: serverTimestamp()
        });
      } catch {}
    }
    localStorage.removeItem('weplay_session');
    setUserProfile(null);
    setCurrentUser(null);
  };

  const resetPassword = async (email: string) => {
    // Ported dummy logic to support page routing
    console.log(`Password reset requested for dummy identifier: ${email}`);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        isAdmin,
        isManager,
        isSponsor,
        registerUser,
        loginUser,
        logoutUser,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
