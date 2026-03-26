import React, { useState } from 'react';
import { User, Mail, Hash, School, CheckCircle2, Clock, Key, Trash2, Loader2, Shield } from 'lucide-react';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/src/firebase';
import { useAuth, handleFirestoreError, OperationType } from '@/src/components/AuthContext';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { userData, user, logout } = useAuth();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!userData || !user) return null;

  const reauthenticate = async () => {
    if (!user.email) return;
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await reauthenticate();
      await updatePassword(user, newPassword);
      toast.success('Password updated successfully');
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (error: any) {
      console.error('Password change error:', error);
      toast.error(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm('Are you sure you want to delete your account? This action is permanent.')) return;
    
    setLoading(true);
    try {
      await reauthenticate();
      
      // Delete user data from Firestore first
      const path = `users/${user.uid}`;
      try {
        await deleteDoc(doc(db, path));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }

      // Delete user from Auth
      await deleteUser(user);
      
      toast.success('Account deleted successfully');
      navigate('/register');
    } catch (error: any) {
      console.error('Account deletion error:', error);
      toast.error(error.message || 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Your Profile</h1>
        <p className="text-neutral-500">Manage your student account and voting status.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <User size={40} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-neutral-900">{userData.name}</h2>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                    <Shield size={12} />
                    {userData.role.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-neutral-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-neutral-500">
                  <Mail size={16} />
                  Email Address
                </div>
                <p className="text-neutral-900 font-medium">{userData.email}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-neutral-500">
                  <Hash size={16} />
                  Student Number
                </div>
                <p className="text-neutral-900 font-medium">{userData.studentNumber || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-neutral-500">
                  <School size={16} />
                  School / Faculty
                </div>
                <p className="text-neutral-900 font-medium">{userData.school || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm space-y-6">
            <h3 className="text-xl font-bold text-neutral-900">Security & Account</h3>
            <div className="space-y-4">
              {!isChangingPassword && !isDeletingAccount ? (
                <div className="flex flex-wrap gap-4">
                  <button 
                    onClick={() => setIsChangingPassword(true)}
                    className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    <Key size={18} />
                    Change Password
                  </button>
                  <button 
                    onClick={() => setIsDeletingAccount(true)}
                    className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={18} />
                    Delete Account
                  </button>
                </div>
              ) : (
                <form onSubmit={isChangingPassword ? handlePasswordChange : handleDeleteAccount} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700">Current Password</label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  {isChangingPassword && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-700">New Password</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-lg border border-neutral-200 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      {isChangingPassword ? 'Update Password' : 'Confirm Delete Account'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsChangingPassword(false);
                        setIsDeletingAccount(false);
                        setCurrentPassword('');
                        setNewPassword('');
                      }}
                      className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={cn(
            "rounded-2xl border p-6 shadow-sm",
            userData.hasVoted 
              ? "bg-green-50 border-green-100" 
              : "bg-amber-50 border-amber-100"
          )}>
            <div className="flex items-center gap-3 mb-4">
              {userData.hasVoted ? (
                <CheckCircle2 className="text-green-600" size={24} />
              ) : (
                <Clock className="text-amber-600" size={24} />
              )}
              <h3 className={cn(
                "font-bold",
                userData.hasVoted ? "text-green-900" : "text-amber-900"
              )}>
                Voting Status
              </h3>
            </div>
            <p className={cn(
              "text-sm",
              userData.hasVoted ? "text-green-700" : "text-amber-700"
            )}>
              {userData.hasVoted 
                ? "You have successfully cast your vote for the 2026 Student Election." 
                : "You haven't voted yet. Please visit the dashboard to cast your vote."}
            </p>
            {!userData.hasVoted && (
              <button
                onClick={() => navigate('/dashboard')}
                className="mt-4 w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 transition-colors"
              >
                Go to Dashboard
              </button>
            )}
          </div>

          <div className="rounded-2xl bg-indigo-600 p-6 text-white shadow-lg shadow-indigo-100">
            <h3 className="mb-4 text-lg font-bold">Voting Guidelines</h3>
            <ul className="space-y-3 text-sm text-indigo-100">
              <li className="flex gap-2">
                <span className="font-bold">•</span>
                You can only vote once per election.
              </li>
              <li className="flex gap-2">
                <span className="font-bold">•</span>
                Your vote is anonymous and secure.
              </li>
              <li className="flex gap-2">
                <span className="font-bold">•</span>
                Once submitted, votes cannot be changed.
              </li>
              <li className="flex gap-2">
                <span className="font-bold">•</span>
                Results will be published after the election ends.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}


