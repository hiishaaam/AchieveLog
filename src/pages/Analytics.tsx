import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, startOfMonth, addMonths, subMonths } from 'date-fns';
import { Button } from '@/components/ui/Button';
import WeeklyView from '@/components/analytics/WeeklyView';
import MonthlyView from '@/components/analytics/MonthlyView';
import AllTimeView from '@/components/analytics/AllTimeView';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

type Tab = 'weekly' | 'monthly' | 'all-time';

export default function Analytics() {
  const [activeTab, setActiveTab] = useState<Tab>('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useStore();

  const fetchData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      let url = '';
      if (activeTab === 'weekly') {
        const start = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const end = format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        url = `/api/analytics/weekly?startDate=${start}&endDate=${end}`;
      } else if (activeTab === 'monthly') {
        const year = format(currentDate, 'yyyy');
        const month = format(currentDate, 'MM');
        url = `/api/analytics/monthly?year=${year}&month=${month}`;
      } else {
        url = '/api/analytics/all-time';
      }

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, currentDate, token]);

  const handlePrev = () => {
    if (activeTab === 'weekly') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else if (activeTab === 'monthly') {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (activeTab === 'weekly') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else if (activeTab === 'monthly') {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Analytics
        </h1>
        
        {/* Tab Navigation */}
        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/10">
          {(['weekly', 'monthly', 'all-time'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize relative",
                activeTab === tab ? "text-white" : "text-slate-400 hover:text-slate-200"
              )}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white/10 rounded-lg border border-white/10 shadow-sm"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{tab.replace('-', ' ')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Date Navigation */}
      {activeTab !== 'all-time' && (
        <div className="flex items-center justify-between bg-slate-900/30 p-2 rounded-xl border border-white/5 max-w-md mx-auto md:mx-0">
          <Button variant="ghost" size="icon" onClick={handlePrev}>
            <ChevronLeft size={20} />
          </Button>
          <div className="flex items-center space-x-2 font-medium text-slate-200">
            <Calendar size={16} className="text-blue-400" />
            <span>
              {activeTab === 'weekly' 
                ? `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
                : format(currentDate, 'MMMM yyyy')
              }
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleNext}>
            <ChevronRight size={20} />
          </Button>
        </div>
      )}

      {/* Content Area */}
      <div className="min-h-[400px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data ? (
          <AnimatePresence mode="wait">
            {activeTab === 'weekly' && (
              <WeeklyView 
                key="weekly" 
                sessions={data.sessions} 
                weekStart={startOfWeek(currentDate, { weekStartsOn: 1 })}
                weekEnd={endOfWeek(currentDate, { weekStartsOn: 1 })}
              />
            )}
            {activeTab === 'monthly' && (
              <MonthlyView 
                key="monthly" 
                sessions={data.sessions} 
                year={parseInt(format(currentDate, 'yyyy'))}
                month={parseInt(format(currentDate, 'MM'))}
              />
            )}
            {activeTab === 'all-time' && (
              <AllTimeView key="all-time" data={data} />
            )}
          </AnimatePresence>
        ) : null}
      </div>
    </div>
  );
}
