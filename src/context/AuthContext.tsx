import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, UserRole, ApprovalStatus } from '../types';

interface AuthContextType {
  currentUser: User | null;
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = userProfile?.role === 'admin' || currentUser?.uid === '19122007';
  const isManager = userProfile?.role === 'manager' && userProfile?.approvalStatus === 'approved';
  const isSponsor = userProfile?.role === 'sponsor' && userProfile?.approvalStatus === 'approved';

  const refreshProfile = async () => {
    if (!auth.currentUser) {
      setUserProfile(null);
      return;
    }
    const uid = auth.currentUser.uid;
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setUserProfile({
          uid: data.uid,
          name: data.name,
          email: data.email,
          role: data.role as UserRole,
          approvalStatus: data.approvalStatus as ApprovalStatus,
          createdAt: data.createdAt,
          lastLogin: data.lastLogin,
        });
      } else {
        // Fallback for admin if profile doesnt exist yet
        if (
          auth.currentUser.email === 'admin_19122007@redpacket.system' ||
          auth.currentUser.uid === '19122007'
        ) {
          const newProfile: UserProfile = {
            uid,
            name: 'Owner / Admin',
            email: auth.currentUser.email || 'admin_19122007@redpacket.system',
            role: 'admin',
            approvalStatus: 'approved',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          };
          await setDoc(userRef, {
            ...newProfile,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
          });
          setUserProfile(newProfile);
        }
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Update last login
        try {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            lastLogin: serverTimestamp(),
          }).catch(async () => {
            // Document might not exist if it's the admin logging in for the custom flow
            if (user.email === 'admin_19122007@redpacket.system') {
              await setDoc(userRef, {
                uid: user.uid,
                name: 'Owner / Admin',
                email: user.email,
                role: 'admin',
                approvalStatus: 'approved',
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
              });
            }
          });
        } catch (e) {
          console.log('Ignore offline/permission error on login update');
        }
        await refreshProfile();
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const registerUser = async (name: string, weplayId: string, password: string) => {
    setLoading(true);
    const email = weplayId.includes('@') ? weplayId.trim() : `${weplayId.trim()}@weplay.system`;
    try {
      // 1. Create a Firebase Authentication account
      const authResult = await createUserWithEmailAndPassword(auth, email, password);
      const user = authResult.user;

      // 2. Add document in Firestore under `users/{uid}` with default pending states
      const userProfileData = {
        uid: user.uid,
        name,
        email,
        role: 'pending',
        approvalStatus: 'Waiting for Approval',
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, 'users', user.uid), userProfileData);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
      }

      // Add audit log
      try {
         const logId = crypto.randomUUID();
         await setDoc(doc(db, 'logs', logId), {
           id: logId,
           userId: user.uid,
           userName: name,
           userRole: 'pending',
           action: 'User Registration',
           details: `User registered with WePlay ID: ${weplayId}`,
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
    let targetEmail = emailOrId.trim();

    // Owner ID logic: Owner ID 19122007
    const isOwnerLogin = targetEmail === '19122007';
    if (isOwnerLogin) {
      targetEmail = 'admin_19122007@redpacket.system';
    } else if (!targetEmail.includes('@')) {
      targetEmail = `${targetEmail}@weplay.system`;
    }

    try {
      try {
        await signInWithEmailAndPassword(auth, targetEmail, password);
      } catch (signInErr: any) {
        // If owner/admin account and not found, try creating it immediately
        if (isOwnerLogin && password === 'Dhawalaradhyakahai' && (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential')) {
          console.log('Owner account not initialized, auto-creating...');
          const authResult = await createUserWithEmailAndPassword(auth, targetEmail, password);
          const user = authResult.user;

          // Write owner profile to firestore
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            name: 'Owner / Admin',
            email: targetEmail,
            role: 'admin',
            approvalStatus: 'approved',
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
          });
          
          // Log signing in
          const logId = crypto.randomUUID();
          await setDoc(doc(db, 'logs', logId), {
            id: logId,
            userId: user.uid,
            userName: 'Owner / Admin',
            userRole: 'admin',
            action: 'Admin Init',
            details: 'Master owner system admin account initialized and logged in.',
            createdAt: serverTimestamp()
          });

          return; // Signed in successfully through signup
        }
        throw signInErr;
      }

      // Record logs if successful
      const tempUser = auth.currentUser;
      if (tempUser) {
        // Log access
        try {
          const logId = crypto.randomUUID();
          await setDoc(doc(db, 'logs', logId), {
            id: logId,
            userId: tempUser.uid,
            userName: tempUser.displayName || tempUser.email || 'User',
            userRole: 'unknown', // refreshed during state load
            action: 'Login',
            details: `User signed in successfully. ID: ${emailOrId}`,
            createdAt: serverTimestamp()
          });
        } catch {}
      }

    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logoutUser = async () => {
    const tempUser = auth.currentUser;
    if (tempUser) {
      try {
        const logId = crypto.randomUUID();
        await setDoc(doc(db, 'logs', logId), {
          id: logId,
          userId: tempUser.uid,
          userName: tempUser.displayName || tempUser.email || 'User',
          userRole: userProfile?.role || 'user',
          action: 'Logout',
          details: 'User logged out successfully.',
          createdAt: serverTimestamp()
        });
      } catch {}
    }
    await signOut(auth);
    setUserProfile(null);
    setCurrentUser(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
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
