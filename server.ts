import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json());
app.use(cors());

// Health Check
app.get('/api/health', async (req, res) => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ status: 'error', message: 'Missing Supabase credentials' });
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('count');

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ status: 'error', message: error.message });
  }
  res.json({ status: 'ok' });
});

// Middleware to verify JWT
const authenticateToken = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  // Mock Token Handler (Bypass Supabase Auth)
  if (token.startsWith('mock-token-')) {
    const userId = token.replace('mock-token-', '');
    req.user = { id: userId };
    return next();
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  req.user = user;
  next();
};

// Helper function for streak calculation
// (End of previous section, maintaining same file continuity)

app.get('/api/companion/resolve', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email parameter is required' });
    }

    // We must query auth.users securely using the service role client
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Failed to find users' });
    }

    const companion = users.find((u: any) => u.email === email);
    if (companion) {
      return res.json({ id: companion.id, email: companion.email });
    } else {
      // Fallback: Check for mock users by trying to match the email prefix to a username
      const username = email.split('@')[0];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', username)
        .limit(1);

      if (profiles && profiles.length > 0) {
        return res.json({ id: profiles[0].id, email: `${profiles[0].username}@mock.local` });
      }

      return res.status(404).json({ error: 'Companion not found' });
    }
  } catch (err: any) {
    console.error('Resolve companion error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
async function getUserStreak(userId: string): Promise<number> {
  const { data: sessions } = await supabase
    .from('study_sessions')
    .select('date')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (!sessions?.length) return 0;

  // Use a Set to get unique dates
  const uniqueDates = [...new Set(sessions.map((s: any) => s.date))];

  // Sort dates descending just to be safe (though query ordered them)
  uniqueDates.sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime());

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if the most recent session was today or yesterday to start the streak
  const lastSessionDate = new Date(uniqueDates[0]);
  lastSessionDate.setHours(0, 0, 0, 0);

  if (lastSessionDate.getTime() !== today.getTime() && lastSessionDate.getTime() !== yesterday.getTime()) {
    return 0;
  }

  // Iterate backwards to count consecutive days
  let currentDate = lastSessionDate;

  for (const dateStr of uniqueDates) {
    const sessionDate = new Date(dateStr);
    sessionDate.setHours(0, 0, 0, 0);

    if (sessionDate.getTime() === currentDate.getTime()) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      // Gap found
      break;
    }
  }

  return streak;
}

// Helper to format email/password
const getCredentials = (username: string, pin: string) => ({
  email: `${username}@example.com`,
  password: `${pin}-achievelog-secret-salt`
});

// Mock User Helper
const createMockUser = async (username: string) => {
  const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

  await supabase.from('profiles').insert({
    id,
    username,
    display_name: username,
    daily_goal_minutes: 240
  });

  return {
    id,
    email: `${username}@mock.local`,
    username,
    display_name: username,
    daily_goal_minutes: 240
  };
};

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, pin } = req.body;
    if (!username || !pin) return res.status(400).json({ message: 'Username and PIN required' });

    // Try Supabase Auth first
    if (!process.env.SUPABASE_URL?.includes('placeholder')) {
      const { email, password } = getCredentials(username, pin);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username, display_name: username } }
      });

      if (!error && data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          username,
          display_name: username,
          daily_goal_minutes: 240
        });
        return res.json({
          token: data.session?.access_token,
          user: {
            id: data.user.id,
            email: data.user.email,
            username,
            display_name: username,
            daily_goal_minutes: 240
          }
        });
      }

      if (error && !error.message.includes('rate limit') && !error.message.includes('security purposes')) {
        console.warn('Supabase Auth failed:', error.message);
      }
    }

    // Fallback: Mock Auth
    console.log('Falling back to Mock Auth for registration');
    const mockUser = await createMockUser(username);

    res.json({
      token: `mock-token-${mockUser.id}`,
      user: mockUser
    });

  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ message: err.message || 'Internal Server Error' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, pin } = req.body;
    if (!username || !pin)
      return res.status(400).json({ message: 'Username and PIN required' });

    // Try Supabase Auth first
    if (!process.env.SUPABASE_URL?.includes('placeholder')) {
      const { email, password } = getCredentials(username, pin);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (!error && data.user && data.session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        return res.json({
          token: data.session.access_token,
          user: {
            id: data.user.id,
            email: data.user.email,
            username: profile?.username || username,
            display_name: profile?.display_name || username,
            daily_goal_minutes: profile?.daily_goal_minutes || 240
          }
        });
      }
    }

    // Fallback: Mock Login
    console.log('Falling back to Mock Login');

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .limit(1);

    const profile = profiles?.[0];

    if (profile) {
      return res.json({
        token: `mock-token-${profile.id}`,
        user: {
          id: profile.id,
          email: `${username}@mock.local`,
          username: profile.username,
          display_name: profile.display_name,
          daily_goal_minutes: profile.daily_goal_minutes
        }
      });
    } else {
      const mockUser = await createMockUser(username);
      return res.json({
        token: `mock-token-${mockUser.id}`,
        user: mockUser
      });
    }

  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ message: err.message || 'Internal Server Error' });
  }
});

// Subject Routes
app.get('/api/subjects', authenticateToken, async (req: any, res) => {
  const { data: subjects, error } = await supabase
    .from('subjects')
    .select('*, chapters(count), study_sessions(duration_minutes)')
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ message: error.message });

  const result = subjects.map((sub: any) => {
    const totalMinutes = sub.study_sessions?.reduce((acc: number, s: any) => acc + s.duration_minutes, 0) || 0;

    return {
      ...sub,
      total_study_minutes: totalMinutes,
      total_chapters: sub.total_chapters,
      completed_chapters: sub.completed_chapters
    };
  });

  res.json(result);
});

app.post('/api/subjects', authenticateToken, async (req: any, res) => {
  const { name, color, icon, total_syllabus_chapters } = req.body;

  console.log("POST /api/subjects called with body:", req.body);
  console.log("User extracted by authenticateToken:", req.user?.id);

  const { data: subject, error } = await supabase
    .from('subjects')
    .insert({
      user_id: req.user.id,
      name, color, icon,
      total_chapters: total_syllabus_chapters
    })
    .select()
    .single();

  if (error) {
    console.error("SUPABASE ERROR on subject insert:", error);
    return res.status(500).json({ message: error.message, details: error.details, code: error.code });
  }

  // Create placeholder chapters
  if (total_syllabus_chapters > 0) {
    const chapters = Array.from({ length: total_syllabus_chapters }, (_, i) => ({
      subject_id: subject.id,
      user_id: req.user.id,
      name: `Chapter ${i + 1}`,
      status: 'not_started'
    }));

    await supabase.from('chapters').insert(chapters);
  }

  res.json(subject);
});

app.delete('/api/subjects/:id', authenticateToken, async (req: any, res) => {
  const { error } = await supabase
    .from('subjects')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ message: error.message });
  res.json({ success: true });
});

// Chapter Routes
app.get('/api/subjects/:id/chapters', authenticateToken, async (req: any, res) => {
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('subject_id', req.params.id)
    .eq('user_id', req.user.id)
    .order('id', { ascending: true });

  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.post('/api/subjects/:id/chapters', authenticateToken, async (req: any, res) => {
  const { name } = req.body;
  const { data, error } = await supabase
    .from('chapters')
    .insert({
      subject_id: req.params.id,
      user_id: req.user.id,
      name,
      status: 'not_started'
    })
    .select()
    .single();

  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.put('/api/chapters/:id', authenticateToken, async (req: any, res) => {
  const { name, status } = req.body;
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (status !== undefined) updates.status = status === 'Not Started' ? 'not_started' : status === 'In Progress' ? 'in_progress' : status === 'Completed' ? 'completed' : status;

  const { data, error } = await supabase
    .from('chapters')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ message: error.message });

  res.json(data);
});

app.delete('/api/chapters/:id', authenticateToken, async (req: any, res) => {
  const { error } = await supabase
    .from('chapters')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ message: error.message });
  res.json({ success: true });
});

// Session Routes
app.get('/api/sessions', authenticateToken, async (req: any, res) => {
  const { data, error } = await supabase
    .from('study_sessions')
    .select('*, subjects(name, color), chapters(name)')
    .eq('user_id', req.user.id)
    .order('date', { ascending: false })
    .order('start_time', { ascending: false });

  if (error) return res.status(500).json({ message: error.message });

  const result = data.map((s: any) => ({
    ...s,
    subject_name: s.subjects?.name,
    subject_color: s.subjects?.color,
    chapter: s.chapters?.name
  }));

  res.json(result);
});

// Helper to get today's date, accepting optional timezone offset
function getToday(req: any): string {
  const tzOffset = req.query.tz || req.headers['x-timezone-offset'];
  if (tzOffset) {
    const now = new Date();
    const offsetMs = parseInt(tzOffset) * 60 * 1000;
    const local = new Date(now.getTime() + offsetMs);
    return local.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

app.get('/api/sessions/today', authenticateToken, async (req: any, res) => {
  const today = getToday(req);
  const { data, error } = await supabase
    .from('study_sessions')
    .select('*, subjects(name, color), chapters(name)')
    .eq('user_id', req.user.id)
    .eq('date', today)
    .order('start_time', { ascending: false });

  if (error) return res.status(500).json({ message: error.message });

  const result = data.map((s: any) => ({
    ...s,
    subject_name: s.subjects?.name,
    subject_color: s.subjects?.color,
    chapter: s.chapters?.name
  }));

  res.json(result);
});

app.get('/api/sessions/today/summary', authenticateToken, async (req: any, res) => {
  const today = getToday(req);

  const { data: sessions, error } = await supabase
    .from('study_sessions')
    .select('duration_minutes, confidence_rating, subjects(name)')
    .eq('user_id', req.user.id)
    .eq('date', today);

  if (error) return res.status(500).json({ message: error.message });

  const { data: profile } = await supabase
    .from('profiles')
    .select('daily_goal_minutes')
    .eq('id', req.user.id)
    .single();

  const totalMinutes = sessions?.reduce((s: number, r: any) => s + r.duration_minutes, 0) || 0;
  const avgConfidence = sessions?.length
    ? sessions.reduce((s: number, r: any) => s + r.confidence_rating, 0) / sessions.length
    : 0;
  const goalMinutes = profile?.daily_goal_minutes || 240;
  const productivityScore = Math.min(100, Math.round(
    (totalMinutes / goalMinutes) * 50 + (avgConfidence / 5) * 50
  ));
  const streak = await getUserStreak(req.user.id);

  res.json({
    totalMinutes,
    sessionCount: sessions?.length || 0,
    subjectsCovered: [...new Set(sessions?.map((s: any) => s.subjects?.name).filter(Boolean))],
    avgConfidence: parseFloat(avgConfidence.toFixed(1)),
    productivityScore,
    streak
  });
});

app.post('/api/sessions', authenticateToken, async (req: any, res) => {
  const { date, subject_id, chapter_id, chapter, topics,
    start_time, end_time, confidence_rating, mood, notes } = req.body;

  const [sh, sm] = start_time.split(':').map(Number);
  const [eh, em] = end_time.split(':').map(Number);
  let duration_minutes = (eh * 60 + em) - (sh * 60 + sm);
  if (duration_minutes < 0) duration_minutes += 24 * 60;
  if (duration_minutes === 0)
    return res.status(400).json({ message: 'Duration must be greater than zero' });

  // Accept chapter_id as number, or chapter as string name
  let finalChapterId = chapter_id;
  if (finalChapterId && isNaN(Number(finalChapterId))) finalChapterId = null;
  if (!finalChapterId && !isNaN(Number(chapter_id))) finalChapterId = Number(chapter_id);

  const { data, error } = await supabase
    .from('study_sessions')
    .insert({
      user_id: req.user.id,
      subject_id: subject_id || null,
      chapter_id: finalChapterId || null,
      date, start_time, end_time, duration_minutes,
      topics: topics || [],
      confidence_rating, mood,
      notes: notes || null
    })
    .select('*, subjects(name, color), chapters(name)')
    .single();

  if (error) return res.status(500).json({ message: error.message });
  res.status(201).json(data);
});

app.put('/api/sessions/:id', authenticateToken, async (req: any, res) => {
  const { start_time, end_time, chapter_id, chapter, ...rest } = req.body;
  const [sh, sm] = start_time.split(':').map(Number);
  const [eh, em] = end_time.split(':').map(Number);
  let duration_minutes = (eh * 60 + em) - (sh * 60 + sm);
  if (duration_minutes < 0) duration_minutes += 24 * 60;
  if (duration_minutes === 0)
    return res.status(400).json({ message: 'Duration must be greater than zero' });

  let finalChapterId = chapter_id;
  if (finalChapterId && isNaN(Number(finalChapterId))) finalChapterId = null;

  const { data, error } = await supabase
    .from('study_sessions')
    .update({ ...rest, start_time, end_time, duration_minutes, chapter_id: finalChapterId || null })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.delete('/api/sessions/:id', authenticateToken, async (req: any, res) => {
  const { error } = await supabase
    .from('study_sessions')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ message: error.message });
  res.json({ success: true });
});

// Exam Routes
app.get('/api/exams', authenticateToken, async (req: any, res) => {
  const { data, error } = await supabase
    .from('exam_targets')
    .select('*')
    .eq('user_id', req.user.id)
    .order('exam_date', { ascending: true });

  if (error) return res.status(500).json({ message: error.message });

  const result = data.map((e: any) => ({
    ...e,
    subjects: e.subject_ids,
    progress: 0,
    linked_subjects: []
  }));

  res.json(result);
});

app.post('/api/exams', authenticateToken, async (req: any, res) => {
  const { name, exam_date, subjects } = req.body;
  const { data, error } = await supabase
    .from('exam_targets')
    .insert({
      user_id: req.user.id,
      name, exam_date,
      subject_ids: subjects
    })
    .select()
    .single();

  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.delete('/api/exams/:id', authenticateToken, async (req: any, res) => {
  const { error } = await supabase
    .from('exam_targets')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ message: error.message });
  res.json({ success: true });
});

// History Routes
app.get('/api/history', authenticateToken, async (req: any, res) => {
  const { startDate, endDate, subjects, mood, minConfidence, search, page = 1, limit = 20 } = req.query;
  const from = (Number(page) - 1) * Number(limit);
  const to = from + Number(limit) - 1;

  let query = supabase
    .from('study_sessions')
    .select('*, subjects(name, color), chapters(name)', { count: 'exact' })
    .eq('user_id', req.user.id);

  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);
  if (subjects) {
    const list = String(subjects).split(',');
    query = query.in('subject_id', list);
  }
  if (mood) query = query.eq('mood', mood);
  if (minConfidence) query = query.gte('confidence_rating', minConfidence);

  query = query.order('date', { ascending: false }).order('start_time', { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) return res.status(500).json({ message: error.message });

  const result = data?.map((s: any) => ({
    ...s,
    subject_name: s.subjects?.name,
    subject_color: s.subjects?.color,
    chapter: s.chapters?.name
  }));

  res.json({
    sessions: result,
    total: count || 0,
    page: Number(page),
    totalPages: Math.ceil((count || 0) / Number(limit))
  });
});

app.post('/api/sessions/bulk-delete', authenticateToken, async (req: any, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'Invalid IDs' });

  const { error } = await supabase
    .from('study_sessions')
    .delete()
    .in('id', ids)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ message: error.message });
  res.json({ success: true });
});

// Settings Routes
app.get('/api/settings', authenticateToken, async (req: any, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(500).json({ message: error.message });

  res.json({
    user_id: data.id,
    display_name: data.display_name,
    daily_goal: (data.daily_goal_minutes || 240) / 60,
    theme: data.theme,
    companion_email: data.companion_email
  });
});

app.put('/api/settings', authenticateToken, async (req: any, res) => {
  const { display_name, daily_goal, theme, companion_email } = req.body;

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name,
      daily_goal_minutes: daily_goal * 60,
      theme,
      companion_email
    })
    .eq('id', req.user.id);

  if (error) return res.status(500).json({ message: error.message });
  res.json({ success: true });
});

app.post('/api/data/clear', authenticateToken, async (req: any, res) => {
  const { error: sErr } = await supabase.from('study_sessions').delete().eq('user_id', req.user.id);
  const { error: cErr } = await supabase.from('chapters').delete().eq('user_id', req.user.id);
  const { error: subErr } = await supabase.from('subjects').delete().eq('user_id', req.user.id);
  const { error: eErr } = await supabase.from('exam_targets').delete().eq('user_id', req.user.id);

  if (sErr || cErr || subErr || eErr) return res.status(500).json({ message: 'Failed to clear some data' });

  res.json({ success: true });
});

// =====================
// Analytics Routes
// =====================

// GET /api/analytics/weekly — returns sessions for a date range
app.get('/api/analytics/weekly', authenticateToken, async (req: any, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ message: 'startDate and endDate are required' });

  const { data, error } = await supabase
    .from('study_sessions')
    .select('*, subjects(name, color), chapters(name)')
    .eq('user_id', req.user.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) return res.status(500).json({ message: error.message });

  const sessions = data.map((s: any) => ({
    ...s,
    subject_name: s.subjects?.name,
    subject_color: s.subjects?.color,
    chapter: s.chapters?.name
  }));

  res.json({ sessions });
});

// GET /api/analytics/monthly — returns sessions for a given month
app.get('/api/analytics/monthly', authenticateToken, async (req: any, res) => {
  const { year, month } = req.query;
  if (!year || !month) return res.status(400).json({ message: 'year and month are required' });

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  const { data, error } = await supabase
    .from('study_sessions')
    .select('*, subjects(name, color), chapters(name)')
    .eq('user_id', req.user.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) return res.status(500).json({ message: error.message });

  const sessions = data.map((s: any) => ({
    ...s,
    subject_name: s.subjects?.name,
    subject_color: s.subjects?.color,
    chapter: s.chapters?.name
  }));

  res.json({ sessions });
});

// GET /api/analytics/all-time — returns aggregated stats
app.get('/api/analytics/all-time', authenticateToken, async (req: any, res) => {
  const { data: sessions, error } = await supabase
    .from('study_sessions')
    .select('duration_minutes, date, confidence_rating, mood, subjects(name, color)')
    .eq('user_id', req.user.id)
    .order('date', { ascending: true });

  if (error) return res.status(500).json({ message: error.message });

  const totalMinutes = sessions.reduce((acc: number, s: any) => acc + s.duration_minutes, 0);
  const totalSessions = sessions.length;
  const avgConfidence = totalSessions
    ? parseFloat((sessions.reduce((acc: number, s: any) => acc + s.confidence_rating, 0) / totalSessions).toFixed(1))
    : 0;

  // Daily breakdown
  const dailyMap: Record<string, number> = {};
  sessions.forEach((s: any) => {
    dailyMap[s.date] = (dailyMap[s.date] || 0) + s.duration_minutes;
  });
  const daysStudied = Object.keys(dailyMap).length;
  const avgDaily = daysStudied ? Math.round(totalMinutes / daysStudied) : 0;

  // Subject breakdown
  const subjectMap: Record<string, { minutes: number; color: string }> = {};
  sessions.forEach((s: any) => {
    const name = s.subjects?.name || 'Unknown';
    if (!subjectMap[name]) subjectMap[name] = { minutes: 0, color: s.subjects?.color || '#666' };
    subjectMap[name].minutes += s.duration_minutes;
  });
  const subjectBreakdown = Object.entries(subjectMap).map(([name, info]) => ({
    name,
    value: info.minutes,
    color: info.color
  }));

  // Mood breakdown
  const moodMap: Record<string, number> = {};
  sessions.forEach((s: any) => {
    moodMap[s.mood] = (moodMap[s.mood] || 0) + 1;
  });

  const streak = await getUserStreak(req.user.id);

  res.json({
    totalMinutes,
    totalSessions,
    avgConfidence,
    daysStudied,
    avgDailyMinutes: avgDaily,
    subjectBreakdown,
    moodBreakdown: moodMap,
    streak,
    sessions: sessions.map((s: any) => ({
      ...s,
      subject_name: s.subjects?.name,
      subject_color: s.subjects?.color,
    }))
  });
});

// GET /api/analytics/summary
app.get('/api/analytics/summary', authenticateToken, async (req: any, res) => {
  const { data, error } = await supabase
    .from('study_sessions')
    .select('duration_minutes')
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ message: error.message });

  const totalMinutes = data.reduce((acc: any, s: any) => acc + s.duration_minutes, 0);

  res.json({
    totalMinutes,
    totalSessions: data.length
  });
});

// =====================
// Companion/User Routes
// =====================

app.get('/api/users/all', authenticateToken, async (req: any, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, daily_goal_minutes')
    .neq('id', req.user.id)
    .limit(10);

  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

// GET /api/users/:id/summary/today — companion's today summary
app.get('/api/users/:id/summary/today', authenticateToken, async (req: any, res) => {
  const companionId = req.params.id;
  const today = getToday(req);

  const { data: sessions, error } = await supabase
    .from('study_sessions')
    .select('duration_minutes, confidence_rating, subjects(name)')
    .eq('user_id', companionId)
    .eq('date', today);

  if (error) return res.status(500).json({ message: error.message });

  const { data: profile } = await supabase
    .from('profiles')
    .select('daily_goal_minutes')
    .eq('id', companionId)
    .single();

  const totalMinutes = sessions?.reduce((s: number, r: any) => s + r.duration_minutes, 0) || 0;
  const avgConfidence = sessions?.length
    ? sessions.reduce((s: number, r: any) => s + r.confidence_rating, 0) / sessions.length
    : 0;
  const goalMinutes = profile?.daily_goal_minutes || 240;
  const productivityScore = Math.min(100, Math.round(
    (totalMinutes / goalMinutes) * 50 + (avgConfidence / 5) * 50
  ));
  const streak = await getUserStreak(companionId);

  res.json({
    totalMinutes,
    sessionCount: sessions?.length || 0,
    subjectsCovered: [...new Set(sessions?.map((s: any) => s.subjects?.name).filter(Boolean))],
    avgConfidence: parseFloat(avgConfidence.toFixed(1)),
    productivityScore,
    streak
  });
});

// GET /api/users/:id/sessions/today — companion's today sessions
app.get('/api/users/:id/sessions/today', authenticateToken, async (req: any, res) => {
  const companionId = req.params.id;
  const today = getToday(req);

  const { data, error } = await supabase
    .from('study_sessions')
    .select('*, subjects(name, color), chapters(name)')
    .eq('user_id', companionId)
    .eq('date', today)
    .order('start_time', { ascending: false });

  if (error) return res.status(500).json({ message: error.message });

  const result = data.map((s: any) => ({
    ...s,
    subject_name: s.subjects?.name,
    subject_color: s.subjects?.color,
    chapter: s.chapters?.name
  }));

  res.json(result);
});

// GET /api/users/:id/analytics/weekly — companion's weekly analytics
app.get('/api/users/:id/analytics/weekly', authenticateToken, async (req: any, res) => {
  const companionId = req.params.id;
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ message: 'startDate and endDate required' });

  const { data, error } = await supabase
    .from('study_sessions')
    .select('*, subjects(name, color), chapters(name)')
    .eq('user_id', companionId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) return res.status(500).json({ message: error.message });

  const sessions = data.map((s: any) => ({
    ...s,
    subject_name: s.subjects?.name,
    subject_color: s.subjects?.color,
    chapter: s.chapters?.name
  }));

  res.json({ sessions });
});

// GET /api/users/:id/subjects — companion's subjects
app.get('/api/users/:id/subjects', authenticateToken, async (req: any, res) => {
  const companionId = req.params.id;

  const { data: subjects, error } = await supabase
    .from('subjects')
    .select('*, chapters(count), study_sessions(duration_minutes)')
    .eq('user_id', companionId);

  if (error) return res.status(500).json({ message: error.message });

  const result = subjects.map((sub: any) => {
    const totalMinutes = sub.study_sessions?.reduce((acc: number, s: any) => acc + s.duration_minutes, 0) || 0;
    return {
      ...sub,
      total_study_minutes: totalMinutes,
      total_chapters: sub.total_chapters,
      completed_chapters: sub.completed_chapters
    };
  });

  res.json(result);
});

// GET /api/users/:id/history — companion's history
app.get('/api/users/:id/history', authenticateToken, async (req: any, res) => {
  const companionId = req.params.id;
  const { startDate, endDate, limit = 100 } = req.query;

  let query = supabase
    .from('study_sessions')
    .select('*, subjects(name, color), chapters(name)')
    .eq('user_id', companionId);

  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);

  query = query.order('date', { ascending: false }).limit(Number(limit));

  const { data, error } = await query;

  if (error) return res.status(500).json({ message: error.message });

  const result = data.map((s: any) => ({
    ...s,
    subject_name: s.subjects?.name,
    subject_color: s.subjects?.color,
    chapter: s.chapters?.name
  }));

  res.json({ sessions: result });
});


async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
