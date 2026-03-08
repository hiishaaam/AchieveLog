import { useState, useEffect } from 'react';
import { Search, Filter, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

interface HistoryFiltersProps {
  onFilterChange: (filters: any) => void;
}

export default function HistoryFilters({ onFilterChange }: HistoryFiltersProps) {
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [minConfidence, setMinConfidence] = useState<number | ''>('');
  const [isExpanded, setIsExpanded] = useState(false);

  const { subjects, token, setSubjects } = useStore();

  useEffect(() => {
    if (subjects.length === 0 && token) {
      fetch('/api/subjects', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setSubjects(data))
        .catch(console.error);
    }
  }, [token]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      applyFilters();
    }, 500);
    return () => clearTimeout(timer);
  }, [search, startDate, endDate, selectedSubjects, minConfidence]);

  const applyFilters = () => {
    onFilterChange({
      search,
      startDate,
      endDate,
      subjects: selectedSubjects.length > 0 ? selectedSubjects.join(',') : '',
      minConfidence
    });
  };

  const toggleSubject = (id: number) => {
    setSelectedSubjects(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4 mb-6">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <Input 
            placeholder="Search chapters, topics, notes..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button 
          variant="outline" 
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn("border-white/10", isExpanded && "bg-white/10 text-white")}
        >
          <Filter size={18} className="mr-2" /> Filters
        </Button>
      </div>

      {isExpanded && (
        <div className="p-4 glass-card rounded-xl animate-in slide-in-from-top-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Date Range</label>
              <div className="flex gap-2">
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-xs" />
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-xs" />
              </div>
            </div>
            
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Min Confidence</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setMinConfidence(minConfidence === star ? '' : star)}
                    className={cn(
                      "w-8 h-8 rounded flex items-center justify-center text-sm border transition-colors",
                      minConfidence === star 
                        ? "bg-blue-600 border-blue-500 text-white" 
                        : "bg-slate-800 border-white/10 text-slate-400 hover:bg-slate-700"
                    )}
                  >
                    {star}★
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-2 block">Subjects</label>
            <div className="flex flex-wrap gap-2">
              {subjects.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => toggleSubject(sub.id)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs border transition-all flex items-center",
                    selectedSubjects.includes(sub.id)
                      ? "bg-blue-600/20 border-blue-500 text-blue-200"
                      : "bg-slate-800 border-white/10 text-slate-400 hover:bg-slate-700"
                  )}
                >
                  <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: sub.color }} />
                  {sub.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
