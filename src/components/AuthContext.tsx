import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from '@/src/firebase';
import { Student } from '@/src/types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface AuthContextType {
  user: FirebaseUser | null;
  userData: Student | null;
  loading: boolean;
  logout: () => Promise<void>;
  updateUserData: (data: Partial<Student>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  userData: null, 
  loading: true,
  logout: async () => {},
  updateUserData: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const path = `users/${user.uid}`;
    const unsubscribeData = onSnapshot(doc(db, path), async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Student;
        // Force admin role if email matches
        const isAdminEmail = user.email === 'tumelomak0813@gmail.com';
        if (isAdminEmail && data.role !== 'admin') {
          const updatedData = { ...data, role: 'admin' as const };
          setUserData(updatedData);
          await setDoc(doc(db, path), { role: 'admin' }, { merge: true });
        } else {
          setUserData(data);
        }
      } else {
        // Create profile if it doesn't exist for the admin
        const isAdminEmail = user.email === 'tumelomak0813@gmail.com';
        if (isAdminEmail) {
          const newAdminData: Student = {
            uid: user.uid,
            name: user.displayName || 'Admin',
            email: user.email || '',
            role: 'admin',
            hasVoted: false,
            studentNumber: 'ADMIN-001',
            school: 'Administration'
          };
          setUserData(newAdminData);
          await setDoc(doc(db, path), newAdminData);
        } else {
          setUserData(null);
        }
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setLoading(false);
    });

    return () => unsubscribeData();
  }, [user]);

  const logout = async () => {
    await signOut(auth);
  };

  const updateUserData = async (data: Partial<Student>) => {
    if (!user) return;
    const path = `users/${user.uid}`;
    try {
      await setDoc(doc(db, path), data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, logout, updateUserData }}>
      {children}
    </AuthContext.Provider>
  );
}
