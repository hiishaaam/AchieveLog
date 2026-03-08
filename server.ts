import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'achievelog-secret-key';

// Database setup
const db = new Database('achievelog.db');
db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    pin_hash TEXT
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    color TEXT,
    icon TEXT,
    total_syllabus_chapters INTEGER DEFAULT 0,
    completed_chapters INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS study_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    subject_id INTEGER,
    date TEXT,
    chapter TEXT,
    topics TEXT, -- JSON string
    start_time TEXT,
    end_time TEXT,
    duration_minutes INTEGER,
    confidence_rating INTEGER,
    notes TEXT,
    mood TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(subject_id) REFERENCES subjects(id)
  );

  CREATE TABLE IF NOT EXISTS exam_targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    exam_date TEXT,
    subjects TEXT, -- JSON string of subject IDs
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER,
    name TEXT,
    status TEXT DEFAULT 'Not Started', -- 'Not Started', 'In Progress', 'Completed'
    FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY,
    display_name TEXT,
    daily_goal INTEGER DEFAULT 4,
    weekly_goal INTEGER DEFAULT 20,
    theme TEXT DEFAULT 'dark',
    accent_color TEXT DEFAULT 'blue',
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

app.use(express.json());
app.use(cors());

// Middleware to verify JWT
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  const { username, pin } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(pin, 10);
    const stmt = db.prepare('INSERT INTO users (username, pin_hash) VALUES (?, ?)');
    const info = stmt.run(username, hashedPassword);
    const token = jwt.sign({ id: info.lastInsertRowid, username }, JWT_SECRET);
    res.json({ token, user: { id: info.lastInsertRowid, username } });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, pin } = req.body;
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  const user = stmt.get(username) as any;

  if (!user) {
    return res.status(400).json({ error: 'User not found' });
  }

  const validPin = await bcrypt.compare(pin, user.pin_hash);
  if (!validPin) {
    return res.status(400).json({ error: 'Invalid PIN' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
  res.json({ token, user: { id: user.id, username: user.username } });
});

// Subject Routes
app.get('/api/subjects', authenticateToken, (req: any, res) => {
  // Get subjects
  const subjectsStmt = db.prepare('SELECT * FROM subjects WHERE user_id = ?');
  const subjects = subjectsStmt.all(req.user.id) as any[];

  // Get chapter stats for each subject
  const statsStmt = db.prepare(`
    SELECT 
      subject_id,
      COUNT(*) as total_chapters,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_chapters,
      SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_chapters
    FROM chapters
    GROUP BY subject_id
  `);
  const stats = statsStmt.all() as any[];
  
  // Get total study time per subject
  const timeStmt = db.prepare(`
    SELECT subject_id, SUM(duration_minutes) as total_minutes
    FROM study_sessions
    WHERE user_id = ?
    GROUP BY subject_id
  `);
  const times = timeStmt.all(req.user.id) as any[];

  // Merge data
  const result = subjects.map(sub => {
    const subStats = stats.find(s => s.subject_id === sub.id) || { total_chapters: 0, completed_chapters: 0, in_progress_chapters: 0 };
    const subTime = times.find(t => t.subject_id === sub.id) || { total_minutes: 0 };
    
    return {
      ...sub,
      total_chapters: subStats.total_chapters,
      completed_chapters: subStats.completed_chapters,
      in_progress_chapters: subStats.in_progress_chapters,
      total_study_minutes: subTime.total_minutes
    };
  });

  res.json(result);
});

app.post('/api/subjects', authenticateToken, (req: any, res) => {
  const { name, color, icon, total_syllabus_chapters } = req.body;
  
  const insertSubject = db.transaction(() => {
    const stmt = db.prepare(`
      INSERT INTO subjects (user_id, name, color, icon)
      VALUES (?, ?, ?, ?)
    `);
    const info = stmt.run(req.user.id, name, color, icon);
    const subjectId = info.lastInsertRowid;

    // Create placeholder chapters if requested
    if (total_syllabus_chapters > 0) {
      const chapterStmt = db.prepare('INSERT INTO chapters (subject_id, name) VALUES (?, ?)');
      for (let i = 1; i <= total_syllabus_chapters; i++) {
        chapterStmt.run(subjectId, `Chapter ${i}`);
      }
    }
    
    return { id: subjectId, ...req.body };
  });

  try {
    const result = insertSubject();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

app.delete('/api/subjects/:id', authenticateToken, (req: any, res) => {
  const stmt = db.prepare('DELETE FROM subjects WHERE id = ? AND user_id = ?');
  const info = stmt.run(req.params.id, req.user.id);
  if (info.changes > 0) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Subject not found' });
  }
});

// Chapter Routes
app.get('/api/subjects/:id/chapters', authenticateToken, (req: any, res) => {
  // Verify subject belongs to user
  const subStmt = db.prepare('SELECT id FROM subjects WHERE id = ? AND user_id = ?');
  const subject = subStmt.get(req.params.id, req.user.id);
  
  if (!subject) return res.status(404).json({ error: 'Subject not found' });

  const stmt = db.prepare('SELECT * FROM chapters WHERE subject_id = ?');
  const chapters = stmt.all(req.params.id);
  res.json(chapters);
});

app.post('/api/subjects/:id/chapters', authenticateToken, (req: any, res) => {
  const { name } = req.body;
  const stmt = db.prepare('INSERT INTO chapters (subject_id, name) VALUES (?, ?)');
  const info = stmt.run(req.params.id, name);
  res.json({ id: info.lastInsertRowid, subject_id: Number(req.params.id), name, status: 'Not Started' });
});

app.put('/api/chapters/:id', authenticateToken, (req: any, res) => {
  const { name, status } = req.body;
  
  // Build query dynamically based on provided fields
  const updates = [];
  const params = [];
  
  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
  }
  
  if (updates.length === 0) return res.json({ success: true }); // Nothing to update
  
  params.push(req.params.id);
  
  const stmt = db.prepare(`UPDATE chapters SET ${updates.join(', ')} WHERE id = ?`);
  const info = stmt.run(...params);
  
  if (info.changes > 0) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Chapter not found' });
  }
});

app.delete('/api/chapters/:id', authenticateToken, (req: any, res) => {
  const stmt = db.prepare('DELETE FROM chapters WHERE id = ?');
  const info = stmt.run(req.params.id);
  res.json({ success: true });
});

// Session Routes
app.get('/api/sessions', authenticateToken, (req: any, res) => {
  const stmt = db.prepare(`
    SELECT s.*, sub.name as subject_name, sub.color as subject_color
    FROM study_sessions s
    LEFT JOIN subjects sub ON s.subject_id = sub.id
    WHERE s.user_id = ?
    ORDER BY s.date DESC, s.start_time DESC
  `);
  const sessions = stmt.all(req.user.id);
  res.json(sessions.map((s: any) => ({
    ...s,
    topics: JSON.parse(s.topics || '[]')
  })));
});

app.get('/api/sessions/today', authenticateToken, (req: any, res) => {
  const today = new Date().toISOString().split('T')[0];
  const stmt = db.prepare(`
    SELECT s.*, sub.name as subject_name, sub.color as subject_color
    FROM study_sessions s
    LEFT JOIN subjects sub ON s.subject_id = sub.id
    WHERE s.user_id = ? AND s.date = ?
    ORDER BY s.start_time DESC
  `);
  const sessions = stmt.all(req.user.id, today);
  res.json(sessions.map((s: any) => ({
    ...s,
    topics: JSON.parse(s.topics || '[]')
  })));
});

app.get('/api/sessions/today/summary', authenticateToken, (req: any, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  // Get user settings for daily goal
  const settingsStmt = db.prepare('SELECT daily_goal FROM user_settings WHERE user_id = ?');
  const settings = settingsStmt.get(req.user.id) as any;
  const goalHours = settings?.daily_goal || 4;
  const goalMinutes = goalHours * 60;

  // Get all sessions for today
  const stmt = db.prepare(`
    SELECT s.*, sub.name as subject_name
    FROM study_sessions s
    LEFT JOIN subjects sub ON s.subject_id = sub.id
    WHERE s.user_id = ? AND s.date = ?
  `);
  const sessions = stmt.all(req.user.id, today) as any[];

  const totalMinutes = sessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
  const sessionCount = sessions.length;
  const subjectsCovered = [...new Set(sessions.map(s => s.subject_name).filter(Boolean))];
  
  const allTopics = sessions.flatMap(s => {
    try {
      return JSON.parse(s.topics || '[]');
    } catch {
      return [];
    }
  });
  const topicsCovered = [...new Set(allTopics)];

  const avgConfidence = sessions.length > 0
    ? sessions.reduce((acc, s) => acc + (s.confidence_rating || 0), 0) / sessions.length
    : 0;

  // Productivity Score Formula: (totalMinutes / goalMinutes) * 50 + (avgConfidence / 5) * 50
  const timeScore = Math.min((totalMinutes / goalMinutes) * 50, 50);
  const confScore = (avgConfidence / 5) * 50;
  const productivityScore = Math.round(timeScore + confScore);

  res.json({
    totalMinutes,
    sessionCount,
    subjectsCovered,
    topicsCovered,
    avgConfidence,
    productivityScore
  });
});

app.post('/api/sessions', authenticateToken, (req: any, res) => {
  const { subject_id, date, chapter, topics, start_time, end_time, confidence_rating, notes, mood } = req.body;
  
  // Server-side duration calculation
  const start = new Date(`1970-01-01T${start_time}:00`);
  const end = new Date(`1970-01-01T${end_time}:00`);
  let duration_minutes = (end.getTime() - start.getTime()) / 60000;
  
  if (duration_minutes <= 0) {
    return res.status(400).json({ error: 'End time must be after start time' });
  }

  const stmt = db.prepare(`
    INSERT INTO study_sessions (user_id, subject_id, date, chapter, topics, start_time, end_time, duration_minutes, confidence_rating, notes, mood)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const info = stmt.run(
    req.user.id, subject_id, date, chapter, JSON.stringify(topics), start_time, end_time, duration_minutes, confidence_rating, notes, mood
  );
  
  res.json({ 
    id: info.lastInsertRowid, 
    user_id: req.user.id,
    subject_id, date, chapter, topics, start_time, end_time, duration_minutes, confidence_rating, notes, mood 
  });
});

// Exam Routes
app.get('/api/exams', authenticateToken, (req: any, res) => {
  const examsStmt = db.prepare('SELECT * FROM exam_targets WHERE user_id = ? ORDER BY exam_date ASC');
  const exams = examsStmt.all(req.user.id).map((e: any) => ({
    ...e,
    subjects: JSON.parse(e.subjects || '[]')
  }));

  // Calculate progress for each exam
  const result = exams.map((exam: any) => {
    const subjectIds = exam.subjects;
    if (subjectIds.length === 0) return { ...exam, progress: 0, linked_subjects: [] };

    const placeholders = subjectIds.map(() => '?').join(',');
    const subStmt = db.prepare(`
      SELECT s.id, s.name, s.color, s.icon,
             (SELECT COUNT(*) FROM chapters c WHERE c.subject_id = s.id) as total_chapters,
             (SELECT COUNT(*) FROM chapters c WHERE c.subject_id = s.id AND c.status = 'Completed') as completed_chapters
      FROM subjects s
      WHERE s.id IN (${placeholders})
    `);
    
    const linkedSubjects = subStmt.all(...subjectIds);
    
    const totalChapters = linkedSubjects.reduce((acc: number, s: any) => acc + s.total_chapters, 0);
    const totalCompleted = linkedSubjects.reduce((acc: number, s: any) => acc + s.completed_chapters, 0);
    
    return {
      ...exam,
      progress: totalChapters > 0 ? Math.round((totalCompleted / totalChapters) * 100) : 0,
      linked_subjects: linkedSubjects.map((s: any) => ({
        ...s,
        progress: s.total_chapters > 0 ? Math.round((s.completed_chapters / s.total_chapters) * 100) : 0
      }))
    };
  });

  res.json(result);
});

app.post('/api/exams', authenticateToken, (req: any, res) => {
  const { name, exam_date, subjects } = req.body;
  const stmt = db.prepare('INSERT INTO exam_targets (user_id, name, exam_date, subjects) VALUES (?, ?, ?, ?)');
  const info = stmt.run(req.user.id, name, exam_date, JSON.stringify(subjects));
  res.json({ id: info.lastInsertRowid, ...req.body });
});

app.delete('/api/exams/:id', authenticateToken, (req: any, res) => {
  const stmt = db.prepare('DELETE FROM exam_targets WHERE id = ? AND user_id = ?');
  const info = stmt.run(req.params.id, req.user.id);
  res.json({ success: true });
});

// History Routes (Advanced)
app.get('/api/history', authenticateToken, (req: any, res) => {
  const { startDate, endDate, subjects, mood, minConfidence, search, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = `
    SELECT s.*, sub.name as subject_name, sub.color as subject_color
    FROM study_sessions s
    LEFT JOIN subjects sub ON s.subject_id = sub.id
    WHERE s.user_id = ?
  `;
  const params: any[] = [req.user.id];

  if (startDate) {
    query += ' AND s.date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND s.date <= ?';
    params.push(endDate);
  }
  if (subjects) {
    const subjectList = String(subjects).split(',');
    query += ` AND s.subject_id IN (${subjectList.map(() => '?').join(',')})`;
    params.push(...subjectList);
  }
  if (mood) {
    query += ' AND s.mood = ?';
    params.push(mood);
  }
  if (minConfidence) {
    query += ' AND s.confidence_rating >= ?';
    params.push(minConfidence);
  }
  if (search) {
    query += ' AND (s.chapter LIKE ? OR s.topics LIKE ? OR s.notes LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  // Count total for pagination
  const countStmt = db.prepare(query.replace('s.*, sub.name as subject_name, sub.color as subject_color', 'COUNT(*) as total'));
  const totalResult = countStmt.get(...params) as any;
  const total = totalResult.total;

  // Fetch paginated data
  query += ' ORDER BY s.date DESC, s.start_time DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const stmt = db.prepare(query);
  const sessions = stmt.all(...params).map((s: any) => ({
    ...s,
    topics: JSON.parse(s.topics || '[]')
  }));

  res.json({ sessions, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
});

app.put('/api/sessions/:id', authenticateToken, (req: any, res) => {
  const { date, subject_id, chapter, topics, start_time, end_time, confidence_rating, mood, notes } = req.body;
  
  // Verify ownership
  const check = db.prepare('SELECT id FROM study_sessions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!check) return res.status(404).json({ error: 'Session not found' });

  // Server-side duration calculation
  let duration_minutes = 0;
  if (start_time && end_time) {
    const start = new Date(`1970-01-01T${start_time}:00`);
    const end = new Date(`1970-01-01T${end_time}:00`);
    duration_minutes = (end.getTime() - start.getTime()) / 60000;
    
    if (duration_minutes <= 0) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }
  }

  const stmt = db.prepare(`
    UPDATE study_sessions 
    SET date = ?, subject_id = ?, chapter = ?, topics = ?, start_time = ?, end_time = ?, duration_minutes = ?, confidence_rating = ?, mood = ?, notes = ?
    WHERE id = ?
  `);
  
  stmt.run(date, subject_id, chapter, JSON.stringify(topics), start_time, end_time, duration_minutes, confidence_rating, mood, notes, req.params.id);
  res.json({ success: true });
});

app.delete('/api/sessions/:id', authenticateToken, (req: any, res) => {
  const stmt = db.prepare('DELETE FROM study_sessions WHERE id = ? AND user_id = ?');
  stmt.run(req.params.id, req.user.id);
  res.json({ success: true });
});

app.post('/api/sessions/bulk-delete', authenticateToken, (req: any, res) => {
  const { ids } = req.body; // Array of IDs
  if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'Invalid IDs' });

  const placeholders = ids.map(() => '?').join(',');
  const stmt = db.prepare(`DELETE FROM study_sessions WHERE id IN (${placeholders}) AND user_id = ?`);
  stmt.run(...ids, req.user.id);
  res.json({ success: true });
});

// Settings Routes
app.get('/api/settings', authenticateToken, (req: any, res) => {
  let settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.user.id);
  
  if (!settings) {
    // Create default settings
    const stmt = db.prepare('INSERT INTO user_settings (user_id) VALUES (?)');
    stmt.run(req.user.id);
    settings = { user_id: req.user.id, daily_goal: 4, weekly_goal: 20, theme: 'dark', accent_color: 'blue', display_name: '' };
  }

  res.json(settings);
});

app.put('/api/settings', authenticateToken, (req: any, res) => {
  const { display_name, daily_goal, weekly_goal, theme, accent_color } = req.body;
  
  const stmt = db.prepare(`
    INSERT INTO user_settings (user_id, display_name, daily_goal, weekly_goal, theme, accent_color)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      display_name = excluded.display_name,
      daily_goal = excluded.daily_goal,
      weekly_goal = excluded.weekly_goal,
      theme = excluded.theme,
      accent_color = excluded.accent_color
  `);
  
  stmt.run(req.user.id, display_name, daily_goal, weekly_goal, theme, accent_color);
  res.json({ success: true });
});

app.post('/api/data/clear', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  db.transaction(() => {
    db.prepare('DELETE FROM study_sessions WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM chapters WHERE subject_id IN (SELECT id FROM subjects WHERE user_id = ?)').run(userId);
    db.prepare('DELETE FROM subjects WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM exam_targets WHERE user_id = ?').run(userId);
    // Keep user account and settings
  })();
  res.json({ success: true });
});

// Analytics Routes
app.get('/api/analytics/weekly', authenticateToken, (req: any, res) => {
  const { startDate, endDate } = req.query; // Expect YYYY-MM-DD

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Start and end dates are required' });
  }

  const sessionsStmt = db.prepare(`
    SELECT s.*, sub.name as subject_name, sub.color as subject_color
    FROM study_sessions s
    LEFT JOIN subjects sub ON s.subject_id = sub.id
    WHERE s.user_id = ? AND s.date >= ? AND s.date <= ?
    ORDER BY s.date ASC
  `);
  
  const sessions = sessionsStmt.all(req.user.id, startDate, endDate).map((s: any) => ({
    ...s,
    topics: JSON.parse(s.topics || '[]')
  }));

  res.json({ sessions });
});

app.get('/api/analytics/monthly', authenticateToken, (req: any, res) => {
  const { year, month } = req.query; // Expect numbers

  if (!year || !month) {
    return res.status(400).json({ error: 'Year and month are required' });
  }

  // Construct date range for the month
  const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
  // Calculate end of month
  const nextMonth = Number(month) === 12 ? 1 : Number(month) + 1;
  const nextYear = Number(month) === 12 ? Number(year) + 1 : Number(year);
  const startOfNextMonth = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  // Get all sessions for the month
  const sessionsStmt = db.prepare(`
    SELECT s.*, sub.name as subject_name, sub.color as subject_color
    FROM study_sessions s
    LEFT JOIN subjects sub ON s.subject_id = sub.id
    WHERE s.user_id = ? AND s.date >= ? AND s.date < ?
    ORDER BY s.date ASC
  `);

  const sessions = sessionsStmt.all(req.user.id, startOfMonth, startOfNextMonth).map((s: any) => ({
    ...s,
    topics: JSON.parse(s.topics || '[]')
  }));

  res.json({ sessions });
});

app.get('/api/analytics/all-time', authenticateToken, (req: any, res) => {
  // Get all sessions
  const sessionsStmt = db.prepare(`
    SELECT s.date, s.duration_minutes
    FROM study_sessions s
    WHERE s.user_id = ?
    ORDER BY s.date ASC
  `);
  const sessions = sessionsStmt.all(req.user.id);

  // Get total stats
  const statsStmt = db.prepare(`
    SELECT 
      COUNT(*) as total_sessions,
      SUM(duration_minutes) as total_minutes
    FROM study_sessions
    WHERE user_id = ?
  `);
  const stats = statsStmt.get(req.user.id) as any;

  // Get completed chapters count
  const chaptersStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM chapters c
    JOIN subjects s ON c.subject_id = s.id
    WHERE s.user_id = ? AND c.status = 'Completed'
  `);
  const chapters = chaptersStmt.get(req.user.id) as any;

  res.json({
    sessions,
    total_sessions: stats.total_sessions || 0,
    total_minutes: stats.total_minutes || 0,
    completed_chapters: chapters.count || 0
  });
});

app.get('/api/analytics/summary', authenticateToken, (req: any, res) => {
  // Total study time
  const totalTimeStmt = db.prepare('SELECT SUM(duration_minutes) as total FROM study_sessions WHERE user_id = ?');
  const totalTime = totalTimeStmt.get(req.user.id) as any;

  // Sessions count
  const sessionCountStmt = db.prepare('SELECT COUNT(*) as count FROM study_sessions WHERE user_id = ?');
  const sessionCount = sessionCountStmt.get(req.user.id) as any;

  res.json({
    totalMinutes: totalTime.total || 0,
    totalSessions: sessionCount.count || 0
  });
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
    const distPath = path.resolve(__dirname, 'dist');
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
