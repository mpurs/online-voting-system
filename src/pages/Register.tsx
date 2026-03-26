import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Vote, Mail, Lock, User, Hash, School, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/src/firebase';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType, useAuth } from '@/src/components/AuthContext';

export default function Register() {
  const { user, userData } = useAuth();
  const isAdminEmail = user?.email === 'tumelomak0813@gmail.com';
  const needsProfile = user && !userData && !isAdminEmail;
  
  const [name, setName] = useState(user?.displayName || '');
  const [studentNumber, setStudentNumber] = useState('');
  const [school, setSchool] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let currentUser = user;
      if (!currentUser) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        currentUser = userCredential.user;
      }
      
      const isAdmin = email === 'tumelomak0813@gmail.com';
      
      const userData = {
        uid: currentUser.uid,
        name,
        studentNumber,
        school,
        email,
        role: isAdmin ? 'admin' : 'student',
        hasVoted: false,
        createdAt: new Date().toISOString()
      };

      const path = `users/${currentUser.uid}`;
      try {
        await setDoc(doc(db, path), userData);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }

      toast.success(needsProfile ? 'Profile completed!' : 'Account created successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      let message = 'Failed to create account. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        message = 'This email is already registered. Please sign in instead.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password is too weak. Please use at least 6 characters.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (error.code === 'auth/operation-not-allowed') {
        message = 'Email/password registration is currently disabled.';
      }
      
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (googleLoading || loading) return;
    setGoogleLoading(true);
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const { doc, getDoc, setDoc } = await import('firebase/firestore');
      const { db } = await import('@/src/firebase');
      const { signOut } = await import('firebase/auth');
      
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const isAdmin = user.email === 'tumelomak0813@gmail.com';
      
      if (!userSnap.exists()) {
        if (isAdmin) {
          // Admin can register directly with Google
          await setDoc(userRef, {
            uid: user.uid,
            name: user.displayName || 'Admin',
            email: user.email,
            role: 'admin',
            hasVoted: false,
            studentNumber: 'ADMIN-001',
            school: 'Administration',
            createdAt: new Date().toISOString()
          });
          toast.success('Admin account created!');
          navigate('/admin');
        } else {
          // Voters MUST use the form to provide student details
          await signOut(auth);
          toast.error('Voters must register using the form to provide student details (Student Number, School).');
          return;
        }
      } else {
        toast.success('Welcome back!');
        navigate(isAdmin ? '/admin' : '/dashboard');
      }
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      
      if (error.code === 'auth/popup-blocked') {
        toast.error('Sign-in popup was blocked by your browser. Please allow popups for this site.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Ignore
      } else if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Sign-in was cancelled.');
      } else {
        toast.error('Failed to sign in with Google. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center py-12">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl shadow-neutral-200/50 border border-neutral-100">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <Vote size={28} />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-neutral-900">
            {needsProfile ? 'Complete Profile' : 'Create Account'}
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            {needsProfile 
              ? 'Please provide your student details to continue' 
              : 'Register to participate in the upcoming elections'}
          </p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700">
                Full Name
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-lg border border-neutral-300 bg-neutral-50 py-2.5 pl-10 pr-3 text-neutral-900 placeholder-neutral-400 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">
                Student Number
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                  <Hash size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  className="block w-full rounded-lg border border-neutral-300 bg-neutral-50 py-2.5 pl-10 pr-3 text-neutral-900 placeholder-neutral-400 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all"
                  placeholder="2024001"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">
                School / Faculty
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                  <School size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="block w-full rounded-lg border border-neutral-300 bg-neutral-50 py-2.5 pl-10 pr-3 text-neutral-900 placeholder-neutral-400 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all"
                  placeholder="School of Engineering"
                />
              </div>
            </div>

            {!needsProfile && (
              <>
                <div>
                  <label className="block text-sm font-medium text-neutral-700">
                    Email Address
                  </label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full rounded-lg border border-neutral-300 bg-neutral-50 py-2.5 pl-10 pr-3 text-neutral-900 placeholder-neutral-400 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all"
                      placeholder="student@university.edu"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700">
                    Password
                  </label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-lg border border-neutral-300 bg-neutral-50 py-2.5 pl-10 pr-10 text-neutral-900 placeholder-neutral-400 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all shadow-lg shadow-indigo-200 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (needsProfile ? 'Saving...' : 'Creating account...') : (needsProfile ? 'Complete Registration' : 'Register Account')}
              {!loading && <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />}
            </button>
          </div>

          {!needsProfile && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-neutral-500">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {googleLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-indigo-600" />
                ) : (
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-5 w-5" referrerPolicy="no-referrer" />
                )}
                {googleLoading ? 'Connecting...' : 'Sign in with Google'}
              </button>
            </>
          )}
        </form>


        <div className="mt-6 text-center text-sm">
          {needsProfile ? (
            <button 
              onClick={() => auth.signOut()}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Sign out and try another account
            </button>
          ) : (
            <>
              <span className="text-neutral-500">Already have an account?</span>{' '}
              <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Sign in
              </Link>
            </>
          )}
        </div>

        <div className="mt-8 rounded-xl bg-indigo-50 p-5 border border-indigo-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="text-indigo-600" size={18} />
            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Admin Access</h4>
          </div>
          <p className="text-xs text-indigo-700 leading-relaxed">
            Admins can sign in directly using <strong>Google</strong> without registering. 
            Voters must register their student details first.
          </p>
        </div>
      </div>
    </div>
  );
}
