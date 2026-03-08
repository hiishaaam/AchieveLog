import { useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { motion } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { formatDuration } from '@/lib/dateUtils';

interface AllTimeViewProps {
  data: {
    sessions: Array<{ date: string; duration_minutes: number }>;
    total_sessions: number;
    total_minutes: number;
    completed_chapters: number;
  };
}

export default function AllTimeView({ data }: AllTimeViewProps) {
  const stats = useMemo(() => {
    // Process trend data (monthly aggregation)
    const monthlyData = new Map();
    
    data.sessions.forEach(s => {
      const monthKey = format(parseISO(s.date), 'yyyy-MM');
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { date: monthKey, minutes: 0 });
      }
      monthlyData.get(monthKey).minutes += s.duration_minutes;
    });

    const trendData = Array.from(monthlyData.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        ...d,
        hours: Number((d.minutes / 60).toFixed(1)),
        label: format(parseISO(d.date + '-01'), 'MMM yyyy')
      }));

    // Calculate Streak
    let currentStreak = 0;
    let maxStreak = 0;
    let lastDate: Date | null = null;
    
    // Sort sessions by date
    const sortedSessions = [...data.sessions].sort((a, b) => a.date.localeCompare(b.date));
    
    // Unique dates
    const uniqueDates = Array.from(new Set(sortedSessions.map(s => s.date))).sort();

    uniqueDates.forEach((dateStr, index) => {
      const currentDate = parseISO(dateStr);
      if (index === 0) {
        currentStreak = 1;
      } else {
        const prevDate = parseISO(uniqueDates[index - 1]);
        const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        if (diffDays === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      }
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    });

    const avgDaily = data.total_sessions > 0 ? Math.round(data.total_minutes / uniqueDates.length) : 0;

    return {
      trendData,
      maxStreak,
      avgDaily
    };
  }, [data]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Cumulative Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-900/50 border-blue-500/20">
          <h3 className="text-sm text-slate-400">Total Hours Logged</h3>
          <p className="text-3xl font-bold text-blue-400">{formatDuration(data.total_minutes)}</p>
        </Card>
        <Card className="p-4 bg-slate-900/50 border-violet-500/20">
          <h3 className="text-sm text-slate-400">Total Sessions</h3>
          <p className="text-3xl font-bold text-violet-400">{data.total_sessions}</p>
        </Card>
        <Card className="p-4 bg-slate-900/50 border-mint-500/20">
          <h3 className="text-sm text-slate-400">Longest Streak</h3>
          <p className="text-3xl font-bold text-emerald-400">{stats.maxStreak} days</p>
        </Card>
        <Card className="p-4 bg-slate-900/50 border-orange-500/20">
          <h3 className="text-sm text-slate-400">Chapters Completed</h3>
          <p className="text-3xl font-bold text-orange-400">{data.completed_chapters}</p>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Monthly Study Trend</h3>
        <div className="h-80 w-full">
          {stats.trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trendData}>
                <defs>
                  <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F8EF7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4F8EF7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} unit="h" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Area type="monotone" dataKey="hours" stroke="#4F8EF7" fillOpacity={1} fill="url(#colorTrend)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
              Not enough data to show trend
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
