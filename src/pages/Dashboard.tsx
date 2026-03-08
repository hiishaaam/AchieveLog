import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useStore, Session } from '../store/useStore';
import { apiCall } from '../lib/api';
import { Clock, BookOpen, Target, Zap, MoreVertical, Edit2, Trash2, Calendar, Star, Smile, Frown, Meh, Plus } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { token, todaySessions, todaySummary, setTodayData, setSessions } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    if (token) {
      const fetchData = async () => {
        try {
          const [summary, sessions] = await Promise.all([
            apiCall('/api/sessions/today/summary'),
            apiCall('/api/sessions/today')
          ]);

          setTodayData(sessions, summary);
        } catch (error) {
          console.error('Failed to fetch dashboard data', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [token, setTodayData]);

  const handleDelete = async (id: number) => {
    try {
      await apiCall(`/api/sessions/${id}`, 'DELETE');

      // Refresh data
      const [summary, sessions] = await Promise.all([
        apiCall('/api/sessions/today/summary'),
        apiCall('/api/sessions/today')
      ]);

      setTodayData(sessions, summary);
      setDeleteId(null);
    } catch (error) {
      console.error('Failed to delete session', error);
    }
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case 'focused': return <Target className="w-4 h-4 text-emerald-400" />;
      case 'neutral': return <Meh className="w-4 h-4 text-blue-400" />;
      case 'distracted': return <Smile className="w-4 h-4 text-yellow-400" />;
      case 'tired': return <Frown className="w-4 h-4 text-rose-400" />;
      default: return <Meh className="w-4 h-4 text-zinc-400" />;
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-zinc-500">Loading dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="text-zinc-400 mt-1">Overview for {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <button
          onClick={() => navigate('/log')}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Log Session
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Time */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-xl">
            <Clock className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <div className="text-sm text-zinc-400">Total Study Time</div>
            <div className="text-2xl font-bold text-white">
              {formatDuration(todaySummary?.totalMinutes || 0)}
            </div>
          </div>
        </div>

        {/* Sessions Count */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl">
            <BookOpen className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="text-sm text-zinc-400">Sessions Today</div>
            <div className="text-2xl font-bold text-white">
              {todaySummary?.sessionCount || 0}
            </div>
          </div>
        </div>

        {/* Subjects Covered */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-violet-500/10 rounded-xl">
            <Target className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <div className="text-sm text-zinc-400">Subjects Covered</div>
            <div className="text-2xl font-bold text-white">
              {todaySummary?.subjectsCovered.length || 0}
            </div>
          </div>
        </div>

        {/* Productivity Score */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 p-5 rounded-2xl flex items-center gap-4">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#27272a"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={todaySummary?.productivityScore && todaySummary.productivityScore > 80 ? '#10b981' : '#f59e0b'}
                strokeWidth="3"
                strokeDasharray={`${todaySummary?.productivityScore || 0}, 100`}
              />
            </svg>
            <Zap className={`w-5 h-5 absolute ${todaySummary?.productivityScore && todaySummary.productivityScore > 80 ? 'text-emerald-400' : 'text-amber-400'}`} />
          </div>
          <div>
            <div className="text-sm text-zinc-400">Productivity Score</div>
            <div className="text-2xl font-bold text-white">
              {todaySummary?.productivityScore || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Session Feed */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Today's Sessions</h2>
        
        {todaySessions.length === 0 ? (
          <div className="bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-zinc-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">No sessions yet today</h3>
              <p className="text-zinc-500 max-w-sm mx-auto mt-1">
                Track your progress and stay consistent. Log your first study session now!
              </p>
            </div>
            <button
              onClick={() => navigate('/log')}
              className="mt-4 bg-white text-black hover:bg-zinc-200 px-6 py-2.5 rounded-xl font-medium transition-colors"
            >
              Log Your First Session →
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence>
              {todaySessions.map((session) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors group"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-medium border"
                          style={{
                            backgroundColor: `${session.subject_color}15`,
                            borderColor: `${session.subject_color}30`,
                            color: session.subject_color
                          }}
                        >
                          {session.subject_name}
                        </span>
                        {session.chapter && (
                          <span className="text-zinc-400 text-sm font-medium flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                            {session.chapter}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {session.topics.map((topic, i) => (
                          <span key={i} className="text-xs text-zinc-400 bg-zinc-800/50 px-2 py-1 rounded-lg border border-white/5">
                            {topic}
                          </span>
                        ))}
                      </div>

                      {session.notes && (
                        <p className="text-sm text-zinc-500 line-clamp-2 max-w-2xl">
                          {session.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end gap-4 md:gap-2 min-w-fit">
                      <div className="flex items-center gap-2 bg-zinc-800/50 px-3 py-1.5 rounded-lg border border-white/5">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-xs font-medium text-zinc-300">
                          {session.start_time} - {session.end_time}
                        </span>
                        <span className="text-xs text-zinc-500 border-l border-white/10 pl-2 ml-1">
                          {formatDuration(session.duration_minutes)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${star <= session.confidence_rating ? 'fill-yellow-500/20 text-yellow-500' : 'text-zinc-700'}`}
                            />
                          ))}
                        </div>
                        <div className="w-px h-3 bg-zinc-800" />
                        {getMoodIcon(session.mood)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-4 border-t border-white/5 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => navigate('/log', { state: { session } })}
                      className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Edit Session"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(session.id)}
                      className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete Session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-lg font-bold text-white mb-2">Delete Session?</h3>
              <p className="text-zinc-400 mb-6">
                Are you sure you want to delete this session? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="px-4 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
