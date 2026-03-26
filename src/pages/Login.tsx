import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Vote, Mail, Lock, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/src/firebase';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Please enter your email address first.');
      return;
    }
    
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent! Please check your inbox.');
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error('Failed to send reset email. Please check the email address.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      let message = 'Failed to sign in. Please try again.';
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        message = 'Invalid email or password. Please check your credentials or register if you don\'t have an account.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many failed attempts. Please try again later.';
      } else if (error.code === 'auth/user-disabled') {
        message = 'This account has been disabled. Please contact support.';
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
          // Admin can sign in directly without registering
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
          toast.success('Welcome, Admin!');
          navigate('/admin');
        } else {
          // Voters must register first
          await signOut(auth);
          toast.error('You must register your student details first before signing in with Google.');
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
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl shadow-neutral-200/50 border border-neutral-100">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <Vote size={28} />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-neutral-900">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            Sign in to your student or admin account
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
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

            <div className="space-y-1">
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
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-500 transition-colors disabled:opacity-50"
                >
                  {resetLoading ? 'Sending...' : 'Forgot Password?'}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all shadow-lg shadow-indigo-200 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />}
            </button>
          </div>

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
        </form>


        <div className="mt-6 text-center text-sm">
          <span className="text-neutral-500">Don't have an account?</span>{' '}
          <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
            Register now
          </Link>
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
