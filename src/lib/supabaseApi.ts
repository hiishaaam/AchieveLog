import { supabase } from './supabase';

// ============ SUBJECTS ============

export async function fetchSubjects(userId: string) {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  // Get chapter counts for each subject
  const enriched = await Promise.all(
    (data || []).map(async (sub) => {
      const { data: chapters } = await supabase
        .from('chapters')
        .select('status')
        .eq('subject_id', sub.id);

      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('duration_minutes')
        .eq('subject_id', sub.id);

      const completedChapters = chapters?.filter((c) => c.status === 'completed').length || 0;
      const inProgressChapters = chapters?.filter((c) => c.status === 'in_progress').length || 0;
      const totalMinutes = sessions?.reduce((acc, s) => acc + (s.duration_minutes || 0), 0) || 0;

      return {
        ...sub,
        completed_chapters: completedChapters,
        in_progress_chapters: inProgressChapters,
        total_study_minutes: totalMinutes,
      };
    })
  );

  return enriched;
}

export async function createSubject(userId: string, data: {
  name: string;
  color: string;
  icon: string;
  total_syllabus_chapters: number;
}) {
  const { data: subject, error } = await supabase
    .from('subjects')
    .insert({
      user_id: userId,
      name: data.name,
      color: data.color,
      icon: data.icon,
      total_chapters: data.total_syllabus_chapters,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Auto-create placeholder chapters
  if (data.total_syllabus_chapters > 0) {
    const chapters = Array.from({ length: data.total_syllabus_chapters }, (_, i) => ({
      subject_id: subject.id,
      user_id: userId,
      name: `Chapter ${i + 1}`,
      status: 'not_started',
    }));
    await supabase.from('chapters').insert(chapters);
  }

  return subject;
}

export async function deleteSubject(subjectId: number, userId: string) {
  const { error } = await supabase
    .from('subjects')
    .delete()
    .eq('id', subjectId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

// ============ CHAPTERS ============

export async function fetchChapters(subjectId: number, userId: string) {
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('subject_id', subjectId)
    .eq('user_id', userId)
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createChapter(subjectId: number, userId: string, name: string) {
  const { data, error } = await supabase
    .from('chapters')
    .insert({ subject_id: subjectId, user_id: userId, name, status: 'not_started' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateChapter(chapterId: number, userId: string, updates: { name?: string; status?: string }) {
  const dbUpdates: any = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.status !== undefined) {
    // Normalize status to DB format
    const statusMap: any = { 'Not Started': 'not_started', 'In Progress': 'in_progress', 'Completed': 'completed' };
    dbUpdates.status = statusMap[updates.status] || updates.status;
  }

  const { data, error } = await supabase
    .from('chapters')
    .update(dbUpdates)
    .eq('id', chapterId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteChapter(chapterId: number, userId: string) {
  const { error } = await supabase
    .from('chapters')
    .delete()
    .eq('id', chapterId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

// ============ SESSIONS ============

export async function fetchTodaySessions(userId: string) {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('study_sessions')
    .select('*, subjects(name, color), chapters(name)')
    .eq('user_id', userId)
    .eq('date', today)
    .order('start_time', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map((s: any) => ({
    ...s,
    subject_name: s.subjects?.name,
    subject_color: s.subjects?.color,
    chapter: s.chapters?.name,
  }));
}

export async function fetchTodaySummary(userId: string) {
  const today = new Date().toISOString().split('T')[0];

  const { data: sessions, error } = await supabase
    .from('study_sessions')
    .select('duration_minutes, confidence_rating, subjects(name)')
    .eq('user_id', userId)
    .eq('date', today);

  if (error) throw new Error(error.message);

  const { data: profile } = await supabase
    .from('profiles')
    .select('daily_goal_minutes')
    .eq('id', userId)
    .single();

  const totalMinutes = sessions?.reduce((acc, s) => acc + (s.duration_minutes || 0), 0) || 0;
  const avgConfidence = sessions?.length
    ? sessions.reduce((acc, s) => acc + (s.confidence_rating || 0), 0) / sessions.length
    : 0;
  const subjectsCovered = [...new Set(sessions?.map((s: any) => s.subjects?.name).filter(Boolean))];

  const goalMinutes = profile?.daily_goal_minutes || 240;
  const productivityScore = Math.min(100, Math.round((totalMinutes / goalMinutes) * 100));

  // Streak calculation
  const streak = await getUserStreak(userId);

  return {
    totalMinutes,
    sessionCount: sessions?.length || 0,
    subjectsCovered,
    topicsCovered: [],
    avgConfidence: Math.round(avgConfidence * 10) / 10,
    productivityScore,
    streak,
  };
}

async function getUserStreak(userId: string): Promise<number> {
  const { data: sessions } = await supabase
    .from('study_sessions')
    .select('date')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (!sessions?.length) return 0;

  const uniqueDates = [...new Set(sessions.map((s: any) => s.date))].sort(
    (a: any, b: any) => new Date(b).getTime() - new Date(a).getTime()
  );

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastSessionDate = new Date(uniqueDates[0]);
  lastSessionDate.setHours(0, 0, 0, 0);

  if (lastSessionDate.getTime() !== today.getTime() && lastSessionDate.getTime() !== yesterday.getTime()) {
    return 0;
  }

  let currentDate = new Date(lastSessionDate);
  for (const dateStr of uniqueDates) {
    const sessionDate = new Date(dateStr);
    sessionDate.setHours(0, 0, 0, 0);
    if (sessionDate.getTime() === currentDate.getTime()) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export async function createSession(userId: string, sessionData: {
  date: string;
  subject_id: number;
  chapter_id?: number | null;
  topics?: string[];
  start_time: string;
  end_time: string;
  duration_minutes: number;
  confidence_rating: number;
  mood: string;
  notes?: string;
}) {
  const { data, error } = await supabase
    .from('study_sessions')
    .insert({
      user_id: userId,
      ...sessionData,
    })
    .select('*, subjects(name, color), chapters(name)')
    .single();

  if (error) throw new Error(error.message);

  return {
    ...data,
    subject_name: data.subjects?.name,
    subject_color: data.subjects?.color,
    chapter: data.chapters?.name,
  };
}

export async function deleteSession(sessionId: number, userId: string) {
  const { error } = await supabase
    .from('study_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

// ============ HISTORY ============

export async function fetchHistory(userId: string, params: {
  subject_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}) {
  let query = supabase
    .from('study_sessions')
    .select('*, subjects(name, color), chapters(name)', { count: 'exact' })
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('start_time', { ascending: false });

  if (params.subject_id) query = query.eq('subject_id', params.subject_id);
  if (params.date_from) query = query.gte('date', params.date_from);
  if (params.date_to) query = query.lte('date', params.date_to);

  const page = params.page || 1;
  const limit = params.limit || 20;
  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);

  const { data, error, count } = await query;

  if (error) throw new Error(error.message);

  const sessions = (data || []).map((s: any) => ({
    ...s,
    subject_name: s.subjects?.name,
    subject_color: s.subjects?.color,
    chapter: s.chapters?.name,
  }));

  return { sessions, total: count || 0, page, pages: Math.ceil((count || 0) / limit) };
}

// ============ ANALYTICS ============

export async function fetchAnalytics(userId: string, period: 'weekly' | 'monthly' | 'all-time') {
  let dateFrom: string | null = null;
  const now = new Date();

  if (period === 'weekly') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    dateFrom = d.toISOString().split('T')[0];
  } else if (period === 'monthly') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    dateFrom = d.toISOString().split('T')[0];
  }

  let query = supabase
    .from('study_sessions')
    .select('date, duration_minutes, confidence_rating, mood, subjects(name)')
    .eq('user_id', userId)
    .order('date', { ascending: true });

  if (dateFrom) query = query.gte('date', dateFrom);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // Group by date for chart
  const dailyMap: Record<string, number> = {};
  let totalMinutes = 0;
  let totalSessions = (data || []).length;
  let totalConfidence = 0;
  const subjectSet = new Set<string>();
  const moodCounts: Record<string, number> = {};

  for (const s of data || []) {
    const date = s.date;
    dailyMap[date] = (dailyMap[date] || 0) + (s.duration_minutes || 0);
    totalMinutes += s.duration_minutes || 0;
    totalConfidence += s.confidence_rating || 0;
    const subName = (s as any).subjects?.name;
    if (subName) subjectSet.add(subName);
    if (s.mood) moodCounts[s.mood] = (moodCounts[s.mood] || 0) + 1;
  }

  const dailyData = Object.entries(dailyMap).map(([date, minutes]) => ({ date, minutes }));

  return {
    dailyData,
    totalMinutes,
    totalSessions,
    avgConfidence: totalSessions ? Math.round((totalConfidence / totalSessions) * 10) / 10 : 0,
    subjectsCovered: [...subjectSet],
    avgDailyMinutes: dailyData.length ? Math.round(totalMinutes / dailyData.length) : 0,
    moodDistribution: moodCounts,
  };
}

// ============ EXAMS ============

export async function fetchExams(userId: string) {
  const { data, error } = await supabase
    .from('exam_targets')
    .select('*')
    .eq('user_id', userId)
    .order('exam_date', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createExam(userId: string, examData: { name: string; exam_date: string; subject_ids?: number[] }) {
  const { data, error } = await supabase
    .from('exam_targets')
    .insert({ user_id: userId, ...examData })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteExam(examId: number, userId: string) {
  const { error } = await supabase
    .from('exam_targets')
    .delete()
    .eq('id', examId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

// ============ SETTINGS ============

export async function fetchSettings(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateSettings(userId: string, updates: { display_name?: string; daily_goal_minutes?: number; theme?: string; companion_email?: string }) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
