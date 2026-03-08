import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useStore, Session, TodaySummary } from '../store/useStore';
import { apiCall } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Clock, BookOpen, Target, Zap, Edit2, Trash2, Calendar, Star, Smile, Frown, Meh, Plus, Eye, RefreshCw, Trophy, Zap as ZapIcon, Handshake, Book } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { 
    user,
    token, 
    todaySessions, 
    todaySummary, 
    setTodayData, 
    companionId,
    companionProfile,
    companionTodaySummary,
    companionTodaySessions,
    setCompanionData
  } = useStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'me' | 'companion'>('me');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Initial Data Fetch (User)
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

  // Companion Data Fetching & Real-time Subscription
  useEffect(() => {
    if (!companionId) return;
    
    const fetchCompanion = async () => {
      try {
        const [summary, sessions] = await Promise.all([
          apiCall(`/api/users/${companionId}/summary/today`),
          apiCall(`/api/users/${companionId}/sessions/today`)
        ]);
        setCompanionData(summary, sessions);
        setLastUpdated(new Date());
      } catch (err) {
        console.warn('Failed to fetch companion data', err);
      }
    };

    fetchCompanion(); // Initial load

    const channel = supabase
      .channel('companion-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_sessions',
          filter: `user_id=eq.${companionId}`
        },
        () => {
          fetchCompanion(); // Auto-update on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companionId, setCompanionData]);

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

  const getComparisonMessage = () => {
    const myMins = todaySummary?.totalMinutes || 0;
    const theirMins = companionTodaySummary?.totalMinutes || 0;
    const diff = Math.abs(myMins - theirMins);

    if (myMins === 0 && theirMins === 0) return { text: "📚 No sessions yet — who logs first?", icon: <Book className="w-5 h-5 text-zinc-400" /> };
    if (diff <= 10) return { text: "🤝 You're neck and neck today!", icon: <Handshake className="w-5 h-5 text-blue-400" /> };
    if (myMins > theirMins) return { text: "🏆 You're ahead today! Keep it up.", icon: <Trophy className="w-5 h-5 text-yellow-400" /> };
    return { text: `⚡ ${companionProfile?.display_name || 'Friend'} is ahead! Time to catch up.`, icon: <ZapIcon className="w-5 h-5 text-violet-400" /> };
  };

  const comparison = getComparisonMessage();

  if (isLoading) {
    return <div className="p-8 text-center text-zinc-500">Loading dashboard...</div>;
  }

  const SummaryCard = ({ title, value, icon: Icon, colorClass, subValue }: any) => (
    <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 p-4 rounded-2xl flex items-center gap-3">
      <div className={`p-2.5 ${colorClass} rounded-xl bg-opacity-10`}>
        <Icon className={`w-5 h-5 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
      <div>
        <div className="text-xs text-zinc-400">{title}</div>
        <div className="text-xl font-bold text-white">{value}</div>
        {subValue && <div className="text-xs text-zinc-500">{subValue}</div>}
      </div>
    </div>
  );

  const SessionCard = ({ session, isReadOnly }: { session: Session, isReadOnly?: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors group"
    >
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div className="flex flex-wrap gap-2 items-center">
            <span
              className="px-2.5 py-1 rounded-full text-xs font-medium border"
              style={{
                backgroundColor: `${session.subject_color}15`,
                borderColor: `${session.subject_color}30`,
                color: session.subject_color
              }}
            >
              {session.subject_name}
            </span>
            {session.chapter && (
              <span className="text-zinc-400 text-xs font-medium flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                {session.chapter}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 bg-zinc-800/50 px-2 py-1 rounded-lg border border-white/5">
            <Clock className="w-3 h-3 text-zinc-400" />
            <span className="text-xs font-medium text-zinc-300">
              {formatDuration(session.duration_minutes)}
            </span>
          </div>
        </div>

        {!isReadOnly && session.notes && (
          <p className="text-sm text-zinc-500 line-clamp-2">
            {session.notes}
          </p>
        )}

        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-3">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3 h-3 ${star <= session.confidence_rating ? 'fill-yellow-500/20 text-yellow-500' : 'text-zinc-800'}`}
                />
              ))}
            </div>
            <div className="w-px h-3 bg-zinc-800" />
            {getMoodIcon(session.mood)}
          </div>

          {!isReadOnly && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => navigate('/log', { state: { session } })}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDeleteId(session.id)}
                className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  const Panel = ({ 
    title, 
    accentColor, 
    summary, 
    sessions, 
    isReadOnly, 
    streak 
  }: { 
    title: string, 
    accentColor: string, 
    summary: TodaySummary | null, 
    sessions: Session[], 
    isReadOnly?: boolean,
    streak?: number
  }) => (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold tracking-tight`} style={{ color: accentColor }}>
            {title}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full text-xs font-medium border border-orange-500/20 flex items-center gap-1">
              <span className="text-xs">🔥</span> {streak || 0} day streak
            </span>
            {isReadOnly && (
              <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full text-xs font-medium border border-zinc-700 flex items-center gap-1">
                <Eye className="w-3 h-3" /> Read-only
              </span>
            )}
          </div>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => navigate('/log')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Log
          </button>
        )}
        {isReadOnly && (
           <div className="text-xs text-zinc-500 flex items-center gap-1">
             <RefreshCw className="w-3 h-3" />
             Updated {Math.floor((new Date().getTime() - lastUpdated.getTime()) / 60000)}m ago
           </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SummaryCard 
          title="Time" 
          value={formatDuration(summary?.totalMinutes || 0)} 
          icon={Clock} 
          colorClass={isReadOnly ? "bg-violet-500" : "bg-indigo-500"} 
        />
        <SummaryCard 
          title="Sessions" 
          value={summary?.sessionCount || 0} 
          icon={BookOpen} 
          colorClass="bg-emerald-500" 
        />
        <SummaryCard 
          title="Subjects" 
          value={summary?.subjectsCovered.length || 0} 
          icon={Target} 
          colorClass={isReadOnly ? "bg-pink-500" : "bg-violet-500"} 
        />
        <SummaryCard 
          title="Score" 
          value={`${summary?.productivityScore || 0}%`} 
          icon={Zap} 
          colorClass="bg-amber-500" 
        />
      </div>

      <div className="flex-1 space-y-3">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
          {isReadOnly ? "Their Sessions" : "Your Sessions"}
        </h3>
        {sessions.length === 0 ? (
          <div className="bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 bg-zinc-800/50 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-zinc-600" />
            </div>
            <p className="text-zinc-500 text-sm">No sessions logged yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => (
              <SessionCard key={session.id} session={session} isReadOnly={isReadOnly} />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 pb-24">
      {/* Mobile Tabs */}
      <div className="md:hidden flex bg-zinc-900/50 p-1 rounded-xl border border-white/5">
        <button 
          onClick={() => setActiveTab('me')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'me' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
        >
          My Day
        </button>
        <button 
          onClick={() => setActiveTab('companion')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'companion' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
        >
          {companionProfile?.display_name || "Friend"}'s Day
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Left Column (User) */}
        <div className={`${activeTab === 'me' ? 'block' : 'hidden'} md:block`}>
          <Panel 
            title={`Hi, ${user?.display_name || user?.username || 'User'}`} 
            accentColor="#4F8EF7"
            summary={todaySummary}
            sessions={todaySessions}
            streak={todaySummary?.productivityScore ? 5 : 0} // Mock streak for now or fetch real one
          />
        </div>

        {/* Right Column (Companion) */}
        <div className={`${activeTab === 'companion' ? 'block' : 'hidden'} md:block border-l border-white/5 md:pl-8 lg:pl-12`}>
           {companionId ? (
             <Panel 
               title={`${companionProfile?.display_name || 'Friend'}'s Day`}
               accentColor="#9B6DFF"
               summary={companionTodaySummary}
               sessions={companionTodaySessions}
               isReadOnly={true}
               streak={3} // Mock streak
             />
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
               <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                 <Handshake className="w-8 h-8 text-zinc-600" />
               </div>
               <h3 className="text-lg font-medium text-white">No Companion Connected</h3>
               <p className="text-zinc-500 mt-2 max-w-xs">
                 Connect with a friend to see their progress and stay motivated together.
               </p>
             </div>
           )}
        </div>
      </div>

      {/* Comparison Widget */}
      {companionId && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-violet-500/5" />
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-2 mb-6">
              {comparison.icon}
              <h3 className="text-lg font-medium text-white">{comparison.text}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              {/* User Stats */}
              <div className="text-center md:text-right">
                <div className="text-sm text-zinc-400 mb-1">{user?.display_name || 'You'}</div>
                <div className="text-2xl font-bold text-white">{formatDuration(todaySummary?.totalMinutes || 0)}</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {todaySummary?.sessionCount || 0} sessions • {todaySummary?.productivityScore || 0}% score
                </div>
              </div>

              {/* Progress Bars */}
              <div className="space-y-4">
                <div className="relative h-4 bg-zinc-800 rounded-full overflow-hidden flex">
                  {/* User Bar */}
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (todaySummary?.totalMinutes || 0) / 4)}%` }} // normalized to some max, say 400 mins
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-blue-500"
                  />
                  {/* Divider */}
                  <div className="w-0.5 h-full bg-zinc-900" />
                  {/* Companion Bar (Right aligned visually via flex-row-reverse if needed, but here we stack or split) */}
                  {/* Actually, let's make it a split bar: Left is user, Right is companion? Or two separate bars? */}
                  {/* The ASCII art suggested [====] 3h ... 2h [===] implies separate bars or a VS bar. */}
                  {/* Let's do two bars facing each other or just a VS layout. */}
                </div>
                {/* Let's try a VS bar: Center split */}
                <div className="flex items-center gap-2">
                   <div className="flex-1 flex justify-end">
                      <div className="h-2 bg-zinc-800 rounded-full w-full max-w-[120px] overflow-hidden flex justify-end">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, ((todaySummary?.totalMinutes || 0) / 300) * 100)}%` }}
                          className="h-full bg-blue-500 rounded-full"
                        />
                      </div>
                   </div>
                   <div className="text-xs font-bold text-zinc-600">VS</div>
                   <div className="flex-1 flex justify-start">
                      <div className="h-2 bg-zinc-800 rounded-full w-full max-w-[120px] overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, ((companionTodaySummary?.totalMinutes || 0) / 300) * 100)}%` }}
                          className="h-full bg-violet-500 rounded-full"
                        />
                      </div>
                   </div>
                </div>
              </div>

              {/* Companion Stats */}
              <div className="text-center md:text-left">
                <div className="text-sm text-zinc-400 mb-1">{companionProfile?.display_name || 'Friend'}</div>
                <div className="text-2xl font-bold text-white">{formatDuration(companionTodaySummary?.totalMinutes || 0)}</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {companionTodaySummary?.sessionCount || 0} sessions • {companionTodaySummary?.productivityScore || 0}% score
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

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
