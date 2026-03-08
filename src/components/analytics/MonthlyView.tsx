import { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { motion } from 'motion/react';
import { format, parseISO, getWeek, getDaysInMonth, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { formatDuration } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

interface Session {
  id: number;
  date: string;
  duration_minutes: number;
  subject_name: string;
  subject_color: string;
  confidence_rating: number;
  mood: string;
}

interface MonthlyViewProps {
  sessions: Session[];
  year: number;
  month: number;
}

export default function MonthlyView({ sessions, year, month }: MonthlyViewProps) {
  const stats = useMemo(() => {
    // Heatmap Data
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(startDate);
    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

    const heatmapData = daysInMonth.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const daySessions = sessions.filter(s => s.date === dayStr);
      const totalMinutes = daySessions.reduce((acc, s) => acc + s.duration_minutes, 0);
      return {
        date: dayStr,
        day: format(day, 'd'),
        minutes: totalMinutes,
        count: daySessions.length,
        intensity: Math.min(4, Math.ceil(totalMinutes / 60)) // 0-4 scale
      };
    });

    // Weekly Breakdown
    const weeklyMap = new Map();
    sessions.forEach(s => {
      const [y, m, d] = s.date.split('-');
      const date = new Date(Number(y), Number(m) - 1, Number(d));
      const weekNum = getWeek(date);
      if (!weeklyMap.has(weekNum)) {
        weeklyMap.set(weekNum, { week: `Week ${weekNum}`, minutes: 0 });
      }
      weeklyMap.get(weekNum).minutes += s.duration_minutes;
    });
    const weeklyData = Array.from(weeklyMap.values()).map(w => ({
      ...w,
      hours: Number((w.minutes / 60).toFixed(1))
    }));

    // Mood Frequency
    const moodMap = new Map();
    sessions.forEach(s => {
      const mood = s.mood || 'neutral';
      moodMap.set(mood, (moodMap.get(mood) || 0) + 1);
    });
    const moodData = Array.from(moodMap.entries()).map(([name, value]) => ({ name, value }));

    // Summary Stats
    const totalMinutes = sessions.reduce((acc, s) => acc + s.duration_minutes, 0);
    const bestWeek = weeklyData.reduce((prev, curr) => (prev.minutes > curr.minutes) ? prev : curr, { week: '-', minutes: 0 });
    
    const subjectMap = new Map();
    sessions.forEach(s => {
      subjectMap.set(s.subject_name, (subjectMap.get(s.subject_name) || 0) + s.duration_minutes);
    });
    const mostStudiedSubject = Array.from(subjectMap.entries()).reduce((prev, curr) => (curr[1] > prev[1] ? curr : prev), ['-', 0]);

    const longestSession = sessions.reduce((prev, curr) => (curr.duration_minutes > prev.duration_minutes ? curr : prev), { duration_minutes: 0, date: '-', subject_name: '-' } as Session);

    return {
      heatmapData,
      weeklyData,
      moodData,
      totalMinutes,
      bestWeek,
      mostStudiedSubject,
      longestSession
    };
  }, [sessions, year, month]);

  const MOOD_COLORS: Record<string, string> = {
    focused: '#10b981', // green
    tired: '#f59e0b', // amber
    distracted: '#ef4444', // red
    neutral: '#64748b', // slate
    motivated: '#3b82f6', // blue
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Monthly Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-900/50 border-blue-500/20">
          <h3 className="text-sm text-slate-400">Total Hours</h3>
          <p className="text-2xl font-bold text-blue-400">{formatDuration(stats.totalMinutes)}</p>
        </Card>
        <Card className="p-4 bg-slate-900/50 border-violet-500/20">
          <h3 className="text-sm text-slate-400">Best Week</h3>
          <p className="text-xl font-bold text-violet-400">{stats.bestWeek.week}</p>
          <p className="text-xs text-slate-500">{formatDuration(stats.bestWeek.minutes)}</p>
        </Card>
        <Card className="p-4 bg-slate-900/50 border-mint-500/20">
          <h3 className="text-sm text-slate-400">Top Subject</h3>
          <p className="text-xl font-bold text-emerald-400">{stats.mostStudiedSubject[0]}</p>
          <p className="text-xs text-slate-500">{formatDuration(stats.mostStudiedSubject[1])}</p>
        </Card>
        <Card className="p-4 bg-slate-900/50 border-orange-500/20">
          <h3 className="text-sm text-slate-400">Longest Session</h3>
          <p className="text-xl font-bold text-orange-400">{formatDuration(stats.longestSession.duration_minutes)}</p>
          <p className="text-xs text-slate-500">{stats.longestSession.subject_name}</p>
        </Card>
      </div>

      {/* Heatmap Calendar */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Activity Heatmap</h3>
        <div className="grid grid-cols-7 gap-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="text-center text-xs text-slate-500 mb-1">{d}</div>
          ))}
          {/* Offset for first day of month */}
          {Array.from({ length: (getDay(new Date(year, month - 1, 1)) + 6) % 7 }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {stats.heatmapData.map((day) => (
            <div 
              key={day.date}
              className={cn(
                "aspect-square rounded-md flex items-center justify-center text-xs cursor-pointer transition-all hover:scale-110 relative group",
                day.intensity === 0 && "bg-slate-800/50 text-slate-600",
                day.intensity === 1 && "bg-green-900/40 text-green-200 border border-green-800/50",
                day.intensity === 2 && "bg-green-700/50 text-green-100 border border-green-600/50",
                day.intensity === 3 && "bg-green-600/60 text-white border border-green-500/50",
                day.intensity >= 4 && "bg-green-500 text-white shadow-lg shadow-green-500/20"
              )}
            >
              {day.day}
              {day.minutes > 0 && (
                <div className="absolute bottom-full mb-2 bg-slate-900 text-xs px-2 py-1 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                  {formatDuration(day.minutes)} • {day.count} sessions
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Breakdown Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Weekly Breakdown</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} unit="h" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  cursor={{ fill: '#1e293b' }}
                />
                <Bar dataKey="hours" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Mood Frequency */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Mood Frequency</h3>
          <div className="h-64 w-full flex items-center justify-center">
             {stats.moodData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.moodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.moodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={MOOD_COLORS[entry.name.toLowerCase()] || '#94a3b8'} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
             ) : (
               <div className="text-slate-500 text-sm">No mood data available</div>
             )}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
