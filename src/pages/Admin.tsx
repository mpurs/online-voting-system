import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Users, BarChart3, Loader2, Download, TrendingUp, Shield } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { collection, onSnapshot, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '@/src/firebase';
import { Candidate } from '@/src/types';
import CandidateModal from '@/src/components/CandidateModal';
import { useAuth, handleFirestoreError, OperationType } from '@/src/components/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'];

export default function Admin() {
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<'candidates' | 'results' | 'users'>('candidates');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);

  // Calculate statistics
  const stats = useMemo(() => {
    const positions = Array.from(new Set(candidates.map(c => c.position)));
    return positions.map(pos => {
      const positionCandidates = candidates.filter(c => c.position === pos);
      const totalVotes = positionCandidates.reduce((sum, c) => sum + c.voteCount, 0);
      
      return {
        position: pos,
        totalVotes,
        candidates: positionCandidates.map(c => ({
          ...c,
          percentage: totalVotes > 0 ? ((c.voteCount / totalVotes) * 100).toFixed(1) : '0'
        }))
      };
    });
  }, [candidates]);

  useEffect(() => {
    const path = 'candidates';
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      const candidateList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Candidate[];
      setCandidates(candidateList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeTab !== 'users') return;
    
    const path = 'users';
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      const userList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(userList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [activeTab]);

  const toggleUserRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'student' : 'admin';
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;
    
    const path = `users/${userId}`;
    try {
      const userRef = doc(db, path);
      const userToUpdate = users.find(u => u.id === userId);
      if (userToUpdate) {
        await setDoc(userRef, { ...userToUpdate, role: newRole });
        toast.success(`User role updated to ${newRole}`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleDownloadResults = () => {
    if (candidates.length === 0) {
      toast.error('No results to download');
      return;
    }

    const headers = ['Candidate Name', 'Position', 'Votes', 'Percentage (%)'];
    const rows = stats.flatMap(posStat => 
      posStat.candidates.map(c => [
        c.name,
        c.position,
        c.voteCount,
        `${c.percentage}%`
      ])
    );

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Makgolo_Election_Results_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Results downloaded successfully');
  };

  const handleAdd = () => {
    setEditingCandidate(null);
    setIsModalOpen(true);
  };

  const handleEdit = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this candidate?')) return;
    
    const path = `candidates/${id}`;
    try {
      await deleteDoc(doc(db, path));
      toast.success('Candidate deleted successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleSave = async (candidateData: Partial<Candidate>) => {
    try {
      if (editingCandidate) {
        const path = `candidates/${editingCandidate.id}`;
        await setDoc(doc(db, path), { ...editingCandidate, ...candidateData });
        toast.success('Candidate updated successfully');
      } else {
        const path = 'candidates';
        const newCandidate = {
          name: candidateData.name || '',
          position: candidateData.position || '',
          imageUrl: candidateData.imageUrl || '',
          voteCount: 0,
        };
        const docRef = await addDoc(collection(db, path), newCandidate);
        // Update the ID field to match document ID for consistency if needed
        await setDoc(docRef, { id: docRef.id }, { merge: true });
        toast.success('Candidate added successfully');
      }
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'candidates');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Admin Control Panel</h1>
          <p className="text-neutral-500">Manage candidates and monitor election results in real-time.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownloadResults}
            className="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors shadow-sm"
          >
            <Download size={18} />
            Download Results
          </button>
          <div className="flex rounded-lg bg-neutral-200 p-1">
            <button
              onClick={() => setActiveTab('candidates')}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                activeTab === 'candidates' ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Users size={18} />
              Candidates
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                activeTab === 'results' ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <BarChart3 size={18} />
              Live Results
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                activeTab === 'users' ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Shield size={18} />
              Users
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'candidates' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button 
              onClick={handleAdd}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
            >
              <Plus size={18} />
              Add Candidate
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">Candidate</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">Position</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">Votes</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-neutral-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {candidates.map((candidate) => (
                  <tr key={candidate.id} className="border-b border-neutral-100 transition-colors hover:bg-neutral-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={candidate.imageUrl}
                          alt={candidate.name}
                          onClick={() => handleEdit(candidate)}
                          className="h-10 w-10 rounded-full object-cover border border-neutral-200 cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <span 
                            className="block font-semibold text-neutral-900 cursor-pointer hover:text-indigo-600 transition-colors"
                            onClick={() => handleEdit(candidate)}
                          >
                            {candidate.name}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-mono">ID: {candidate.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                        {candidate.position}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-12 rounded-full bg-neutral-100 overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500" 
                            style={{ width: `${Math.min(100, (candidate.voteCount / 100) * 100)}%` }} 
                          />
                        </div>
                        <span className="text-sm font-medium text-neutral-700">{candidate.voteCount}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => handleEdit(candidate)}
                          className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-indigo-600 transition-all active:scale-90"
                          title="Edit Candidate"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(candidate.id)}
                          className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600 transition-all active:scale-90"
                          title="Delete Candidate"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'results' && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {stats.map((posStat) => (
            <div key={posStat.position} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-neutral-800">{posStat.position} Results</h3>
                  <p className="text-sm text-neutral-500">Total Votes: {posStat.totalVotes}</p>
                </div>
                <div className="rounded-full bg-indigo-50 p-2 text-indigo-600">
                  <TrendingUp size={20} />
                </div>
              </div>

              <div className="mb-8 h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={posStat.candidates}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip
                      cursor={{ fill: '#f9fafb' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="voteCount" radius={[4, 4, 0, 0]}>
                      {posStat.candidates.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-4">
                {posStat.candidates.sort((a, b) => b.voteCount - a.voteCount).map((candidate) => (
                  <div key={candidate.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-neutral-700">{candidate.name}</span>
                      <span className="text-neutral-500">{candidate.voteCount} votes ({candidate.percentage}%)</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div 
                        className="h-full bg-indigo-600 transition-all duration-500" 
                        style={{ width: `${candidate.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-neutral-900">User Management</h3>
            <p className="text-sm text-neutral-500">{users.length} total users</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-500">
                  <th className="pb-4 font-medium uppercase tracking-wider text-xs">Name</th>
                  <th className="pb-4 font-medium uppercase tracking-wider text-xs">Email</th>
                  <th className="pb-4 font-medium uppercase tracking-wider text-xs">Role</th>
                  <th className="pb-4 font-medium uppercase tracking-wider text-xs">Status</th>
                  <th className="pb-4 font-medium uppercase tracking-wider text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {users.map((u) => (
                  <tr key={u.id} className="group hover:bg-neutral-50/50 transition-colors">
                    <td className="py-4 font-medium text-neutral-900">{u.name}</td>
                    <td className="py-4 text-neutral-500">{u.email}</td>
                    <td className="py-4">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        u.role === 'admin' ? "bg-indigo-100 text-indigo-700" : "bg-neutral-100 text-neutral-600"
                      )}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4">
                      {u.hasVoted ? (
                        <span className="text-green-600 flex items-center gap-1 text-xs font-medium">
                          <TrendingUp size={14} /> Voted
                        </span>
                      ) : (
                        <span className="text-neutral-400 text-xs">Not Voted</span>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      <button
                        onClick={() => toggleUserRole(u.id, u.role)}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-bold disabled:opacity-50"
                        disabled={u.email === 'tumelomak0813@gmail.com'}
                      >
                        Toggle Role
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CandidateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        candidate={editingCandidate}
      />
    </div>
  );
}


