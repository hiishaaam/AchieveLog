import { create } from 'zustand';

export interface User {
  id: string;
  username: string;
  display_name?: string;
  email?: string;
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

export interface TodaySummary {
  totalMinutes: number;
  sessionCount: number;
  subjectsCovered: string[];
  topicsCovered: string[];
  avgConfidence: number;
  productivityScore: number;
  streak?: number;
}

export interface DailyAnalytic {
  date: string;
  minutes: number;
}

interface AppState {
  user: User | null;
  token: string | null;
  subjects: Subject[];
  sessions: Session[];
  todaySessions: Session[];
  todaySummary: TodaySummary | null;
  isLoading: boolean;
  
  // Companion Data
  companionId: string | null;
  companionProfile: {
    id: string;
    username: string;
    display_name: string;
  } | null;
  companionTodaySummary: TodaySummary | null;
  companionTodaySessions: Session[];
  companionWeeklyData: DailyAnalytic[];

  setUser: (user: User | null, token: string | null) => void;
  setSubjects: (subjects: Subject[]) => void;
  addSubject: (subject: Subject) => void;
  updateSubject: (id: number, updates: Partial<Subject>) => void;
  deleteSubject: (id: number) => void;
  
  setSessions: (sessions: Session[]) => void;
  addSession: (session: Session) => void;
  setTodayData: (sessions: Session[], summary: any) => void;
  setCompanionData: (summary: TodaySummary, sessions: Session[]) => void;
  setCompanionProfile: (id: string, profile: { id: string; username: string; display_name: string }) => void;
  logout: () => void;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  user: JSON.parse(localStorage.getItem('achievelog_user') || 'null'),
  token: localStorage.getItem('achievelog_token'),
  subjects: [],
  sessions: [],
  todaySessions: [],
  todaySummary: null,
  isLoading: false,

  companionId: null,
  companionProfile: null,
  companionTodaySummary: null,
  companionTodaySessions: [],
  companionWeeklyData: [],

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
  
  setCompanionData: (summary, sessions) => set({
    companionTodaySummary: summary,
    companionTodaySessions: sessions
  }),
  setCompanionProfile: (id, profile) => set({ companionId: id, companionProfile: profile }),

  logout: () => {
    localStorage.removeItem('achievelog_user');
    localStorage.removeItem('achievelog_token');
    set({ 
      user: null, 
      token: null, 
      subjects: [], 
      sessions: [], 
      todaySessions: [], 
      todaySummary: null,
      companionId: null,
      companionProfile: null,
      companionTodaySummary: null,
      companionTodaySessions: [],
      companionWeeklyData: []
    });
  },

  login: async (email, password) => {
    const BASE_URL = import.meta.env.VITE_API_URL ?? '';
    try {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) throw new Error('Login failed');
      
      const data = await response.json();
      get().setUser(data.user, data.token);

      // Fetch companion
      // In a real app we'd have a specific endpoint or logic, 
      // here we fetch all users and pick the one that isn't us.
      // Note: This endpoint /api/users/all doesn't exist in the server code provided in previous steps.
      // I will assume the user wants me to add this logic even if the endpoint might fail or needs to be added later.
      // Or maybe I should use Supabase client directly if allowed, but the prompt says "fetch(`${BASE_URL}/api/users/all`)".
      // I will follow the prompt exactly.
      try {
        const allUsers = await fetch(`${BASE_URL}/api/users/all`, {
           headers: { 'Authorization': `Bearer ${data.token}` }
        }).then(r => r.json());
        
        if (Array.isArray(allUsers)) {
            const companion = allUsers.find((u: any) => u.id !== data.user.id);
            if (companion) {
                set({ companionId: companion.id, companionProfile: companion });
            }
        }
      } catch (err) {
        console.warn('Failed to fetch companion', err);
      }

    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}));
