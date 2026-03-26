import React, { useState, useEffect } from 'react';
import { CheckCircle2, Award, Loader2 } from 'lucide-react';
import { collection, onSnapshot, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '@/src/firebase';
import { cn } from '@/src/lib/utils';
import { Candidate } from '@/src/types';
import { useAuth, handleFirestoreError, OperationType } from '@/src/components/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedVotes, setSelectedVotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  const positions = Array.from(new Set(candidates.map(c => c.position)));

  const handleVote = (position: string, candidateId: string) => {
    if (userData?.hasVoted) return;
    setSelectedVotes(prev => ({ ...prev, [position]: candidateId }));
  };

  const submitVotes = async () => {
    if (!user || !userData) return;
    if (Object.keys(selectedVotes).length < positions.length) {
      toast.error('Please select a candidate for each position.');
      return;
    }

    setSubmitting(true);
    
    try {
      await runTransaction(db, async (transaction) => {
        // 1. Check if user has already voted
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await transaction.get(userRef);
        if (userDoc.data()?.hasVoted) {
          throw new Error('You have already cast your vote.');
        }

        // 2. READ ALL candidates first
        const candidateData: { ref: any, data: any }[] = [];
        for (const position of positions) {
          const candidateId = selectedVotes[position];
          const candidateRef = doc(db, 'candidates', candidateId);
          const candidateDoc = await transaction.get(candidateRef);
          
          if (!candidateDoc.exists()) {
            throw new Error(`Candidate ${candidateId} not found.`);
          }
          candidateData.push({ ref: candidateRef, data: candidateDoc.data() });
        }

        // 3. PERFORM ALL WRITES after all reads
        for (const { ref, data } of candidateData) {
          const newCount = (data.voteCount || 0) + 1;
          transaction.update(ref, { voteCount: newCount });

          const voteRef = doc(collection(db, 'votes'));
          transaction.set(voteRef, {
            userId: user.uid,
            candidateId: ref.id,
            position: data.position,
            timestamp: serverTimestamp()
          });
        }

        // 4. Mark user as voted
        transaction.update(userRef, { hasVoted: true });
      });

      toast.success('Your votes have been cast successfully!');
    } catch (error: any) {
      console.error('Voting error:', error);
      toast.error(error.message || 'Failed to cast votes');
    } finally {
      setSubmitting(false);
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
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Makgolo Election 2026</h1>
        <p className="text-neutral-500">Cast your vote for the future of our campus.</p>
        {userData?.hasVoted && (
          <div className="mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-green-100 px-4 py-1.5 text-sm font-semibold text-green-700">
            <CheckCircle2 size={16} />
            You have already voted
          </div>
        )}
      </header>

      {userData?.hasVoted ? (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-indigo-900">Thank you for voting!</h2>
          <p className="mt-2 text-indigo-700">Your participation helps shape our community. Results will be announced soon.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {positions.length === 0 ? (
            <div className="text-center py-20 bg-neutral-50 rounded-2xl border border-dashed border-neutral-300">
              <p className="text-neutral-500 font-medium">No candidates have been registered yet.</p>
            </div>
          ) : (
            positions.map((position: string) => (
              <section key={position} className="space-y-6">
                <div className="flex items-center gap-3 border-b border-neutral-200 pb-4">
                  <Award className="text-indigo-600" size={24} />
                  <h2 className="text-xl font-bold text-neutral-800">{position}</h2>
                </div>
                
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {candidates.filter(c => c.position === position).map((candidate) => (
                    <div
                      key={candidate.id}
                      onClick={() => handleVote(position, candidate.id)}
                      className={cn(
                        "group relative cursor-pointer overflow-hidden rounded-2xl border-2 bg-white p-4 transition-all hover:shadow-xl",
                        selectedVotes[position] === candidate.id
                          ? "border-indigo-600 ring-4 ring-indigo-50"
                          : "border-neutral-100 hover:border-indigo-200"
                      )}
                    >
                      <div className="aspect-square overflow-hidden rounded-xl bg-neutral-100">
                        <img
                          src={candidate.imageUrl}
                          alt={candidate.name}
                          className="h-full w-full object-cover transition-transform group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-neutral-900">{candidate.name}</h3>
                          <p className="text-sm text-neutral-500">{candidate.position} Candidate</p>
                        </div>
                        {selectedVotes[position] === candidate.id && (
                          <div className="rounded-full bg-indigo-600 p-1.5 text-white">
                            <CheckCircle2 size={16} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}

          {positions.length > 0 && (
            <div className="sticky bottom-8 flex justify-center pt-8">
              <button
                onClick={submitVotes}
                disabled={submitting || Object.keys(selectedVotes).length < positions.length}
                className="rounded-full bg-indigo-600 px-12 py-4 text-lg font-bold text-white shadow-2xl shadow-indigo-200 transition-all hover:bg-indigo-700 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 active:scale-95 flex items-center gap-2"
              >
                {submitting && <Loader2 className="animate-spin" size={20} />}
                {submitting ? 'Submitting...' : 'Submit All Votes'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

