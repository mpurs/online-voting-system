export interface Candidate {
  id: string;
  name: string;
  position: string;
  imageUrl: string;
  voteCount: number;
}

export interface Student {
  uid: string;
  name: string;
  studentNumber: string;
  email: string;
  school: string;
  hasVoted: boolean;
  role: 'student' | 'admin';
}

export interface Vote {
  id: string;
  studentId: string;
  candidateId: string;
  position: string;
  timestamp: string;
}
