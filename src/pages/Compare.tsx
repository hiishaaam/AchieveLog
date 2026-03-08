import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { apiCall } from '../lib/api';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Calendar, PieChart as PieChartIcon, Flame, Trophy } from 'lucide-react';

export default function Compare() {
  const { user, companionId, companionProfile, todaySummary, companionTodaySummary } = useStore();
  const [activeTab, setActiveTab] = useState<'week' | 'subjects' | 'streaks'>('week');
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [subjectData, setSubjectData] = useState<{ me: any[], friend: any[] }>({ me: [], friend: [] });
  const [streakData, setStreakData] = useState<{ me: any[], friend: any[] }>({ me: [], friend: [] });
  const [stats, setStats] = useState<any>({ me: {}, friend: {} });

  const fetchCompareData = useCallback(async () => {
    if (!user || !companionId) {
      setLoading(false);
      return;
    }

    try {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Monday
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const startStr = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
      const endStr = `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, '0')}-${String(endOfWeek.getDate()).padStart(2, '0')}`;

      // Fetch Weekly Data
      const [myWeekly, friendWeekly] = await Promise.all([
        apiCall(`/api/analytics/weekly?startDate=${startStr}&endDate=${endStr}`),
        apiCall(`/api/users/${companionId}/analytics/weekly?startDate=${startStr}&endDate=${endStr}`).catch(() => ({ sessions: [] }))
      ]);

      // Process Weekly Data for Bar Chart
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const processedWeekly = days.map((day, index) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + index);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        const mySessions = myWeekly.sessions.filter((s: any) => s.date === dateStr);
        const friendSessions = friendWeekly.sessions?.filter((s: any) => s.date === dateStr) || [];

        const myHours = mySessions.reduce((acc: number, s: any) => acc + s.duration_minutes, 0) / 60;
        const friendHours = friendSessions.reduce((acc: number, s: any) => acc + s.duration_minutes, 0) / 60;

        return {
          day,
          [user.display_name || 'You']: parseFloat(myHours.toFixed(1)),
          [companionProfile?.display_name || 'Friend']: parseFloat(friendHours.toFixed(1)),
          mySessions,
          friendSessions
        };
      });
      setWeeklyData(processedWeekly);

      // Calculate Stats
      const calculateStats = (sessions: any[]) => {
        const totalMinutes = sessions.reduce((acc, s) => acc + s.duration_minutes, 0);
        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;
        
        const daysWithSessions = new Set(sessions.map(s => s.date)).size;
        const avgConfidence = sessions.length 
          ? (sessions.reduce((acc, s) => acc + s.confidence_rating, 0) / sessions.length).toFixed(1)
          : 0;

        // Best Day
        const dailyTotals: Record<string, number> = {};
        sessions.forEach(s => {
          dailyTotals[s.date] = (dailyTotals[s.date] || 0) + s.duration_minutes;
        });
        const bestDate = Object.keys(dailyTotals).reduce((a, b) => dailyTotals[a] > dailyTotals[b] ? a : b, '');
        const bestDayMinutes = dailyTotals[bestDate] || 0;
        const bestDayHours = Math.floor(bestDayMinutes / 60);

        return {
          totalTime: `${totalHours}h ${remainingMinutes}m`,
          consistency: `${daysWithSessions}/7`,
          avgConfidence,
          totalSessions: sessions.length,
          bestDay: bestDate ? `${new Date(bestDate).toLocaleDateString('en-US', { weekday: 'short' })} ${bestDayHours}h` : '-'
        };
      };

      setStats({
        me: calculateStats(myWeekly.sessions),
        friend: calculateStats(friendWeekly.sessions || [])
      });

      // Fetch Subject Data
      const [mySubjects, friendSubjects] = await Promise.all([
        apiCall('/api/subjects'),
        apiCall(`/api/users/${companionId}/subjects`).catch(() => [])
      ]);

      const processSubjects = (subjects: any[]) => {
          return subjects.map(s => ({
            name: s.name,
            value: s.total_study_minutes || 0,
            color: s.color
          })).filter(s => s.value > 0);
      };

      setSubjectData({
        me: processSubjects(mySubjects),
        friend: processSubjects(friendSubjects)
      });

      // Fetch Streak Data (Heatmap)
      const todayDate = new Date();
      const end30 = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
      todayDate.setDate(todayDate.getDate() - 30);
      const start30 = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
      
      const [myHistory, friendHistory] = await Promise.all([
          apiCall(`/api/history?startDate=${start30}&endDate=${end30}&limit=100`),
          apiCall(`/api/users/${companionId}/history?startDate=${start30}&endDate=${end30}&limit=100`).catch(() => ({ sessions: [] }))
      ]);

      const processHeatmap = (sessions: any[]) => {
          const map: Record<string, number> = {};
          for(let i=0; i<30; i++) {
              const d = new Date();
              d.setDate(d.getDate() - i);
              const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              map[dateStr] = 0;
          }
          
          sessions.forEach(s => {
              if(map[s.date] !== undefined) {
                  map[s.date] += s.duration_minutes;
              }
          });
          
          return Object.entries(map).map(([date, minutes]) => ({
              date,
              minutes,
              intensity: minutes === 0 ? 0 : minutes < 60 ? 1 : minutes < 120 ? 2 : minutes < 240 ? 3 : 4
          })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      };

      setStreakData({
          me: processHeatmap(myHistory.sessions),
          friend: processHeatmap(friendHistory.sessions || [])
      });

    } catch (error) {
      console.error("Failed to fetch compare data", error);
    } finally {
      setLoading(false);
    }
  }, [user, companionId, companionProfile]);

  useEffect(() => {
    fetchCompareData();

    if (!user || !companionId) return;

    const channel = supabase
      .channel('compare-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_sessions',
          filter: `user_id=eq.${user.id}`
        },
        () => fetchCompareData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_sessions',
          filter: `user_id=eq.${companionId}`
        },
        () => fetchCompareData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCompareData, user, companionId]);

  if (!companionId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-800">
          <Users className="w-10 h-10 text-zinc-600" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">No Companion Connected</h2>
        <p className="text-zinc-400 max-w-md">
          Connect with a friend to unlock comparison features, compete on leaderboards, and visualize your progress together.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Loading comparison data...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 pb-24">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-500" />
            Compare
          </h1>
          <p className="text-zinc-400 mt-1">
            You vs {companionProfile?.display_name || 'Friend'}
          </p>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-white/5 w-full sm:w-auto">
          {[
            { id: 'week', label: 'This Week', icon: Calendar },
            { id: 'subjects', label: 'Subjects', icon: PieChartIcon },
            { id: 'streaks', label: 'Streaks', icon: Flame },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.id 
                  ? 'bg-zinc-800 text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'week' && (
          <motion.div
            key="week"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Chart */}
            <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <XAxis dataKey="day" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}h`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ fill: '#27272a', opacity: 0.4 }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey={user?.display_name || 'You'} fill="#4F8EF7" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  <Bar dataKey={companionProfile?.display_name || 'Friend'} fill="#9B6DFF" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Stats Table */}
            <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="p-4 text-sm font-medium text-zinc-400">Metric</th>
                    <th className="p-4 text-sm font-medium text-[#4F8EF7]">You</th>
                    <th className="p-4 text-sm font-medium text-[#9B6DFF]">{companionProfile?.display_name || 'Friend'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr>
                    <td className="p-4 text-zinc-300">Total Time</td>
                    <td className="p-4 text-white font-medium">{stats.me.totalTime}</td>
                    <td className="p-4 text-white font-medium">{stats.friend.totalTime}</td>
                  </tr>
                  <tr>
                    <td className="p-4 text-zinc-300">Best Day</td>
                    <td className="p-4 text-white font-medium">{stats.me.bestDay}</td>
                    <td className="p-4 text-white font-medium">{stats.friend.bestDay}</td>
                  </tr>
                  <tr>
                    <td className="p-4 text-zinc-300">Consistency</td>
                    <td className="p-4 text-white font-medium">{stats.me.consistency}</td>
                    <td className="p-4 text-white font-medium">{stats.friend.consistency}</td>
                  </tr>
                  <tr>
                    <td className="p-4 text-zinc-300">Avg Confidence</td>
                    <td className="p-4 text-white font-medium">{stats.me.avgConfidence} ⭐</td>
                    <td className="p-4 text-white font-medium">{stats.friend.avgConfidence} ⭐</td>
                  </tr>
                  <tr>
                    <td className="p-4 text-zinc-300">Total Sessions</td>
                    <td className="p-4 text-white font-medium">{stats.me.totalSessions}</td>
                    <td className="p-4 text-white font-medium">{stats.friend.totalSessions}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'subjects' && (
          <motion.div
            key="subjects"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* My Subjects */}
              <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 flex flex-col items-center">
                <h3 className="text-lg font-medium text-white mb-6">Your Distribution</h3>
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={subjectData.me}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {subjectData.me.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Friend's Subjects */}
              <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 flex flex-col items-center">
                <h3 className="text-lg font-medium text-white mb-6">{companionProfile?.display_name || 'Friend'}'s Distribution</h3>
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={subjectData.friend}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {subjectData.friend.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Shared Subjects Message */}
            {subjectData.me.some(s => subjectData.friend.some(f => f.name === s.name)) && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-center">
                <p className="text-indigo-300 font-medium">
                  You both studied <span className="text-white font-bold">
                    {subjectData.me.filter(s => subjectData.friend.some(f => f.name === s.name)).map(s => s.name).join(', ')}
                  </span> this week 📚
                </p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'streaks' && (
          <motion.div
            key="streaks"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* My Heatmap */}
              <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                <h3 className="text-lg font-medium text-white mb-4">You</h3>
                <div className="grid grid-cols-7 gap-2">
                  {streakData.me.map((day, i) => (
                    <div 
                      key={i}
                      title={`${day.date}: ${day.minutes} mins`}
                      className={`aspect-square rounded-md transition-all hover:scale-110 ${
                        day.intensity === 0 ? 'bg-zinc-800' :
                        day.intensity === 1 ? 'bg-emerald-900/40' :
                        day.intensity === 2 ? 'bg-emerald-700/60' :
                        day.intensity === 3 ? 'bg-emerald-500' :
                        'bg-[#00E5B4] shadow-[0_0_10px_#00E5B4]'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Friend's Heatmap */}
              <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                <h3 className="text-lg font-medium text-white mb-4">{companionProfile?.display_name || 'Friend'}</h3>
                <div className="grid grid-cols-7 gap-2">
                  {streakData.friend.map((day, i) => (
                    <div 
                      key={i}
                      title={`${day.date}: ${day.minutes} mins`}
                      className={`aspect-square rounded-md transition-all hover:scale-110 ${
                        day.intensity === 0 ? 'bg-zinc-800' :
                        day.intensity === 1 ? 'bg-emerald-900/40' :
                        day.intensity === 2 ? 'bg-emerald-700/60' :
                        day.intensity === 3 ? 'bg-emerald-500' :
                        'bg-[#00E5B4] shadow-[0_0_10px_#00E5B4]'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Streak Stats */}
            <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-around gap-6 text-center">
              <div>
                <div className="text-sm text-zinc-400 mb-1">Current Streak</div>
                <div className="flex items-center gap-4 text-xl font-bold text-white">
                  <span className="flex items-center gap-1"><Flame className="w-5 h-5 text-orange-500" /> You: {todaySummary?.streak || 0} days</span>
                  <span className="w-px h-6 bg-zinc-700" />
                  <span className="flex items-center gap-1"><Flame className="w-5 h-5 text-zinc-600" /> {companionProfile?.display_name || 'Friend'}: {companionTodaySummary?.streak || 0} days</span>
                </div>
              </div>
              <div>
                <div className="text-sm text-zinc-400 mb-1">All-time Best</div>
                <div className="flex items-center gap-4 text-xl font-bold text-white">
                  <span className="flex items-center gap-1"><Trophy className="w-5 h-5 text-yellow-500" /> You: 12 days</span>
                  <span className="w-px h-6 bg-zinc-700" />
                  <span className="flex items-center gap-1"><Trophy className="w-5 h-5 text-zinc-600" /> {companionProfile?.display_name || 'Friend'}: 8 days</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
