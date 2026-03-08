import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useStore, Subject, Chapter, Session } from '../store/useStore';
import { apiCall } from '../lib/api';
import { Calendar, Clock, BookOpen, Tag, Star, Smile, Frown, Meh, Target, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function LogSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, subjects, setSubjects, addSession, setTodayData } = useStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    subjectId: '',
    chapterId: '', // Optional, can be empty or 'custom'
    customChapter: '',
    topics: [] as string[],
    currentTopic: '',
    startTime: '',
    endTime: '',
    confidence: 0,
    mood: '',
    notes: ''
  });

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Initialize form if editing
  useEffect(() => {
    if (location.state?.session) {
      const session = location.state.session as Session;
      setIsEditing(true);
      setEditId(session.id);
      
      // Determine if chapter is custom or existing will be handled after chapters load
      // For now set the values
      setFormData({
        date: session.date,
        subjectId: session.subject_id.toString(),
        chapterId: '', // Will be set after chapters fetch
        customChapter: session.chapter, // Default to custom, will check against ID later
        topics: session.topics,
        currentTopic: '',
        startTime: session.start_time,
        endTime: session.end_time,
        confidence: session.confidence_rating,
        mood: session.mood,
        notes: session.notes || ''
      });
    }
  }, [location.state]);

  // Fetch subjects on mount if empty
  useEffect(() => {
    if (subjects.length === 0 && token) {
      apiCall('/api/subjects')
      .then(data => setSubjects(data))
      .catch(err => console.error('Failed to fetch subjects', err));
    }
  }, [token, subjects.length, setSubjects]);

  // Fetch chapters when subject changes
  useEffect(() => {
    if (formData.subjectId) {
      setIsLoadingChapters(true);
      apiCall(`/api/subjects/${formData.subjectId}/chapters`)
      .then(data => {
        setChapters(data);
        setIsLoadingChapters(false);
        
        // If editing, try to match chapter name to ID
        if (location.state?.session && location.state.session.subject_id.toString() === formData.subjectId) {
            const sessionChapterName = location.state.session.chapter;
            const matchedChapter = data.find((c: Chapter) => c.name === sessionChapterName);
            if (matchedChapter) {
                setFormData(prev => ({ ...prev, chapterId: matchedChapter.id.toString(), customChapter: '' }));
            } else {
                setFormData(prev => ({ ...prev, chapterId: 'custom', customChapter: sessionChapterName }));
            }
        }
      })
      .catch(err => {
        console.error('Failed to fetch chapters', err);
        setIsLoadingChapters(false);
      });
    } else {
      setChapters([]);
    }
  }, [formData.subjectId, token, location.state]);

  const handleTopicKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTopic();
    }
  };

  const addTopic = () => {
    const topic = formData.currentTopic.trim();
    if (topic && !formData.topics.includes(topic) && formData.topics.length < 10) {
      setFormData(prev => ({
        ...prev,
        topics: [...prev.topics, topic],
        currentTopic: ''
      }));
    }
  };

  const removeTopic = (topicToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      topics: prev.topics.filter(t => t !== topicToRemove)
    }));
  };

  const getDuration = () => {
    if (!formData.startTime || !formData.endTime) return null;
    const start = new Date(`1970-01-01T${formData.startTime}:00`);
    const end = new Date(`1970-01-01T${formData.endTime}:00`);
    const diff = (end.getTime() - start.getTime()) / 60000; // minutes
    return diff > 0 ? diff : null;
  };

  const duration = getDuration();
  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.subjectId) {
      setError('Please select a subject');
      return;
    }
    if (formData.topics.length === 0) {
      setError('Please add at least one topic');
      return;
    }
    if (!formData.startTime || !formData.endTime) {
      setError('Please set start and end times');
      return;
    }
    if (duration && duration <= 0) {
      setError('End time must be after start time');
      return;
    }
    if (formData.confidence === 0) {
      setError('Please rate your confidence');
      return;
    }
    if (!formData.mood) {
      setError('Please select your mood');
      return;
    }

    setIsSubmitting(true);

    const resolvedChapterId = formData.chapterId && formData.chapterId !== 'custom' 
      ? Number(formData.chapterId) 
      : null;

    const payload = {
      date: formData.date,
      subject_id: Number(formData.subjectId),
      chapter_id: resolvedChapterId,
      topics: formData.topics,
      start_time: formData.startTime,
      end_time: formData.endTime,
      confidence_rating: formData.confidence,
      mood: formData.mood,
      notes: formData.notes
    };

    console.log("=== SUBMIT TRIGGERED ===");
    console.log("Form payload:", payload);
    console.log("Token present:", !!token);

    try {
      const url = isEditing ? `/api/sessions/${editId}` : '/api/sessions';
      const method = isEditing ? 'PUT' : 'POST';

      const data = await apiCall(url, method, payload);
      console.log("Response body:", data);

      // If creating, we get the new session back. If updating, we get success: true
      // In both cases, we should refresh the store data
      
      // Fetch updated summary
      const summaryData = await apiCall('/api/sessions/today/summary');
      
      // We need to fetch all today sessions to update the store correctly
      const todaySessionsData = await apiCall('/api/sessions/today');
      
      setTodayData(todaySessionsData, summaryData);

      // Success effects
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      setSuccess(isEditing ? 'Session updated successfully!' : `Session saved! You studied ${formatDuration(duration || 0)}.`);
      
      if (!isEditing) {
        // Reset form (keep date and subject)
        setFormData(prev => ({
          ...prev,
          chapterId: '',
          customChapter: '',
          topics: [],
          currentTopic: '',
          startTime: '',
          endTime: '',
          confidence: 0,
          mood: '',
          notes: ''
        }));
      } else {
          // If editing, maybe navigate back to dashboard after a delay?
          setTimeout(() => navigate('/'), 1500);
      }

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err: any) {
      console.error("FETCH ERROR:", err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const moods = [
    { id: 'focused', icon: Target, label: 'Focused', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/50' },
    { id: 'neutral', icon: Meh, label: 'Neutral', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/50' },
    { id: 'distracted', icon: Smile, label: 'Distracted', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/50' },
    { id: 'tired', icon: Frown, label: 'Tired', color: 'text-rose-400', bg: 'bg-rose-400/10 border-rose-400/50' },
  ];

  const confidenceLabels = {
    1: "Very Low — barely understood",
    2: "Low — need more revision",
    3: "Moderate — understood with effort",
    4: "Good — mostly clear",
    5: "Excellent — fully mastered"
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-white">{isEditing ? 'Edit Session' : 'Log Session'}</h1>
          <div className="text-sm text-zinc-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Success/Error Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-200"
            >
              <AlertCircle className="w-5 h-5 text-red-400" />
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3 text-emerald-200"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: What & When */}
          <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 space-y-6">
            <h2 className="text-lg font-medium text-zinc-200 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              What did you study?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="date"
                    required
                    max={new Date().toISOString().split('T')[0]}
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-zinc-800/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Subject</label>
                {subjects.length === 0 ? (
                  <div className="text-sm text-yellow-500/80 py-2.5">
                    Add a subject first <a href="/subjects" className="underline hover:text-yellow-400">here →</a>
                  </div>
                ) : (
                  <select
                    required
                    value={formData.subjectId}
                    onChange={e => setFormData({ ...formData, subjectId: e.target.value, chapterId: '', customChapter: '' })}
                    className="w-full bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all appearance-none"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Chapter */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-zinc-400">Chapter</label>
                <div className="flex gap-2">
                  <select
                    value={formData.chapterId}
                    onChange={e => setFormData({ ...formData, chapterId: e.target.value })}
                    disabled={!formData.subjectId}
                    className="flex-1 bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all disabled:opacity-50"
                  >
                    <option value="">Select Chapter (Optional)</option>
                    {chapters.map(ch => (
                      <option key={ch.id} value={ch.id}>{ch.name}</option>
                    ))}
                    <option value="custom">Other / Custom</option>
                  </select>
                </div>
                {formData.chapterId === 'custom' && (
                  <motion.input
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    type="text"
                    placeholder="Enter chapter name..."
                    value={formData.customChapter}
                    onChange={e => setFormData({ ...formData, customChapter: e.target.value })}
                    className="w-full mt-2 bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all"
                  />
                )}
              </div>

              {/* Topics */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-zinc-400">Topics Covered <span className="text-zinc-600">(Press Enter to add)</span></label>
                <div className="bg-zinc-800/50 border border-white/10 rounded-xl p-2 flex flex-wrap gap-2 min-h-[50px]">
                  {formData.topics.map(topic => (
                    <span key={topic} className="bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-lg text-sm flex items-center gap-1.5">
                      {topic}
                      <button type="button" onClick={() => removeTopic(topic)} className="hover:text-white">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={formData.currentTopic}
                    onChange={e => setFormData({ ...formData, currentTopic: e.target.value })}
                    onKeyDown={handleTopicKeyDown}
                    placeholder={formData.topics.length === 0 ? "e.g. Thermodynamics, Newton's Laws..." : ""}
                    className="bg-transparent border-none outline-none text-white placeholder-zinc-600 flex-1 min-w-[120px] px-2 py-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Time & Metrics */}
          <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 space-y-6">
            <h2 className="text-lg font-medium text-zinc-200 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              Time & Focus
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Start Time */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Start Time</label>
                <input
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all"
                />
              </div>

              {/* End Time */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">End Time</label>
                <input
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all"
                />
              </div>
            </div>

            {/* Duration Badge */}
            <AnimatePresence>
              {duration && duration > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center justify-center p-3 rounded-xl border ${duration > 240 ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'}`}
                >
                  <span className="font-medium">Duration: {formatDuration(duration)}</span>
                  {duration > 240 && <span className="ml-2 text-sm opacity-80">— That's a long session! Take breaks.</span>}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Confidence */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-400">Confidence Rating</label>
              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, confidence: star })}
                      className={`p-2 rounded-full transition-all ${formData.confidence >= star ? 'text-yellow-400 scale-110' : 'text-zinc-700 hover:text-zinc-500'}`}
                    >
                      <Star className={`w-8 h-8 ${formData.confidence >= star ? 'fill-yellow-400' : ''}`} />
                    </button>
                  ))}
                </div>
                <div className="h-6 text-sm font-medium text-zinc-300">
                  {formData.confidence > 0 && confidenceLabels[formData.confidence as keyof typeof confidenceLabels]}
                </div>
              </div>
            </div>

            {/* Mood */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-400">Mood During Study</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {moods.map(m => {
                  const Icon = m.icon;
                  const isSelected = formData.mood === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, mood: m.id })}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${isSelected ? m.bg + ' ' + m.color : 'bg-zinc-800/30 border-white/5 text-zinc-500 hover:bg-zinc-800/50'}`}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="text-sm font-medium">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Notes <span className="text-zinc-600">(Optional)</span></label>
              <div className="relative">
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  maxLength={500}
                  rows={3}
                  placeholder="Any observations, struggles, or things to revisit..."
                  className="w-full bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all resize-none"
                />
                <div className="absolute bottom-3 right-3 text-xs text-zinc-600">
                  {formData.notes.length}/500
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium py-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving Session...
              </>
            ) : (
              'Save Session'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
