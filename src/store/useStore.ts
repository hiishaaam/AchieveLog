import { create } from 'zustand';

export interface User {
  id: number;
  username: string;
}

export interface Subject {
  id: number;
  name: string;
  color: string;
  icon: string;
  total_chapters: number;
  completed_chapters: number;
  in_progress_chapters: number;
  total_study_minutes: number;
}

export interface Chapter {
  id: number;
  subject_id: number;
  name: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
}

export interface Session {
  id: number;
  subject_id: number;
  subject_name?: string;
  subject_color?: string;
  date: string;
  chapter: string;
  topics: string[];
  start_time: string;
  end_time: string;
  duration_minutes: number;
  confidence_rating: number;
  notes: string;
  mood: string;
}

interface AppState {
  user: User | null;
  token: string | null;
  subjects: Subject[];
  sessions: Session[];
  todaySessions: Session[];
  todaySummary: {
    totalMinutes: number;
    sessionCount: number;
    subjectsCovered: string[];
    topicsCovered: string[];
    avgConfidence: number;
    productivityScore: number;
  } | null;
  isLoading: boolean;
  
  setUser: (user: User | null, token: string | null) => void;
  setSubjects: (subjects: Subject[]) => void;
  addSubject: (subject: Subject) => void;
  updateSubject: (id: number, updates: Partial<Subject>) => void;
  deleteSubject: (id: number) => void;
  
  setSessions: (sessions: Session[]) => void;
  addSession: (session: Session) => void;
  setTodayData: (sessions: Session[], summary: any) => void;
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  user: JSON.parse(localStorage.getItem('achievelog_user') || 'null'),
  token: localStorage.getItem('achievelog_token'),
  subjects: [],
  sessions: [],
  todaySessions: [],
  todaySummary: null,
  isLoading: false,

  setUser: (user, token) => {
    if (user && token) {
      localStorage.setItem('achievelog_user', JSON.stringify(user));
      localStorage.setItem('achievelog_token', token);
    } else {
      localStorage.removeItem('achievelog_user');
      localStorage.removeItem('achievelog_token');
    }
    set({ user, token });
  },

  setSubjects: (subjects) => set({ subjects }),
  addSubject: (subject) => set((state) => ({ subjects: [...state.subjects, subject] })),
  updateSubject: (id, updates) => set((state) => ({
    subjects: state.subjects.map(s => s.id === id ? { ...s, ...updates } : s)
  })),
  deleteSubject: (id) => set((state) => ({
    subjects: state.subjects.filter(s => s.id !== id)
  })),
  
  setSessions: (sessions) => set({ sessions }),
  addSession: (session) => set((state) => ({ 
    sessions: [session, ...state.sessions],
    todaySessions: session.date === new Date().toISOString().split('T')[0] 
      ? [session, ...state.todaySessions] 
      : state.todaySessions
  })),
  setTodayData: (sessions, summary) => set({ todaySessions: sessions, todaySummary: summary }),

  logout: () => {
    localStorage.removeItem('achievelog_user');
    localStorage.removeItem('achievelog_token');
    set({ user: null, token: null, subjects: [], sessions: [], todaySessions: [], todaySummary: null });
  },
}));
