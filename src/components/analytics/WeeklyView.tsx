import { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import { motion } from 'motion/react';
import { format, parseISO, getDay } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { formatDuration } from '@/lib/dateUtils';

interface Session {
  id: number;
  date: string;
  duration_minutes: number;
  subject_name: string;
  subject_color: string;
  confidence_rating: number;
  mood: string;
}

interface WeeklyViewProps {
  sessions: Session[];
  weekStart: Date;
  weekEnd: Date;
}

export default function WeeklyView({ sessions, weekStart, weekEnd }: WeeklyViewProps) {
  // Process Data
  const stats = useMemo(() => {
    const totalMinutes = sessions.reduce((acc, s) => acc + s.duration_minutes, 0);
    const totalSessions = sessions.length;
    
    // Daily Stats
    const dailyMap = new Map();
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    days.forEach(d => dailyMap.set(d, { name: d, minutes: 0, confidence: 0, count: 0 }));
    
    sessions.forEach(s => {
      const date = parseISO(s.date);
      // getDay returns 0 for Sunday, 1 for Monday. We want 0 for Mon, 6 for Sun
      let dayIndex = getDay(date) - 1;
      if (dayIndex === -1) dayIndex = 6;
      
      const dayName = days[dayIndex];
      const entry = dailyMap.get(dayName);
      entry.minutes += s.duration_minutes;
      entry.confidence += s.confidence_rating;
      entry.count += 1;
    });

    const dailyData = Array.from(dailyMap.values()).map(d => ({
      ...d,
      hours: Number((d.minutes / 60).toFixed(1)),
      avgConfidence: d.count > 0 ? Number((d.confidence / d.count).toFixed(1)) : 0
    }));

    // Best Day
    const bestDay = dailyData.reduce((prev, current) => (prev.minutes > current.minutes) ? prev : current, { name: '-', minutes: 0 });

    // Consistency
    const daysStudied = dailyData.filter(d => d.minutes > 0).length;
    const consistency = Math.round((daysStudied / 7) * 100);

    // Subject Distribution
    const subjectMap = new Map();
    sessions.forEach(s => {
      if (!subjectMap.has(s.subject_name)) {
        subjectMap.set(s.subject_name, { name: s.subject_name, value: 0, color: s.subject_color });
      }
      subjectMap.get(s.subject_name).value += s.duration_minutes;
    });
    const subjectData = Array.from(subjectMap.values()).map(s => ({ ...s, hours: Number((s.value / 60).toFixed(1)) }));

    return {
      totalMinutes,
      totalSessions,
      dailyData,
      bestDay,
      consistency,
      subjectData
    };
  }, [sessions]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-900/50 border-blue-500/20">
          <h3 className="text-sm text-slate-400">Total Study Time</h3>
          <p className="text-2xl font-bold text-blue-400">{formatDuration(stats.totalMinutes)}</p>
        </Card>
        <Card className="p-4 bg-slate-900/50 border-violet-500/20">
          <h3 className="text-sm text-slate-400">Best Day</h3>
          <p className="text-2xl font-bold text-violet-400">{stats.bestDay.name} <span className="text-sm text-slate-500 font-normal">({formatDuration(stats.bestDay.minutes)})</span></p>
        </Card>
        <Card className="p-4 bg-slate-900/50 border-mint-500/20">
          <h3 className="text-sm text-slate-400">Daily Average</h3>
          <p className="text-2xl font-bold text-emerald-400">{formatDuration(Math.round(stats.totalMinutes / 7))}</p>
        </Card>
        <Card className="p-4 bg-slate-900/50 border-orange-500/20">
          <h3 className="text-sm text-slate-400">Consistency</h3>
          <p className="text-2xl font-bold text-orange-400">{stats.consistency}%</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Hours Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Daily Study Hours</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} unit="h" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  cursor={{ fill: '#1e293b' }}
                />
                <Bar dataKey="hours" fill="url(#colorGradient)" radius={[4, 4, 0, 0]}>
                  {stats.dailyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#4F8EF7', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'][index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Subject Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Subject Distribution</h3>
          <div className="h-64 w-full flex items-center justify-center relative">
            {stats.subjectData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.subjectData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.subjectData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#e2e8f0' }}
                      formatter={(value: number) => formatDuration(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{stats.subjectData.length}</p>
                    <p className="text-xs text-slate-400">Subjects</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-slate-500 text-sm">No data available</div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {stats.subjectData.map((sub, idx) => (
              <div key={idx} className="flex items-center text-xs text-slate-300">
                <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: sub.color }} />
                {sub.name}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Confidence Trend */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Confidence Trend</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.dailyData}>
              <defs>
                <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00E5B4" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00E5B4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 5]} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Area type="monotone" dataKey="avgConfidence" stroke="#00E5B4" fillOpacity={1} fill="url(#colorConfidence)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Session Log Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold">Session Log</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900/50 text-slate-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Mood</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">{format(parseISO(session.date), 'MMM d')}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center">
                        <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: session.subject_color }} />
                        {session.subject_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">{formatDuration(session.duration_minutes)}</td>
                    <td className="px-4 py-3">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`w-1.5 h-1.5 rounded-full mr-0.5 ${i < session.confidence_rating ? 'bg-blue-400' : 'bg-slate-700'}`} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-400">{session.mood}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No sessions logged this week</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
}
