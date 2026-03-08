import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Trash2, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ICON_MAP } from '@/lib/constants';
import { cn } from '@/lib/utils';
import ChapterList from './ChapterList';
import { useStore } from '@/store/useStore';

interface SubjectCardProps {
  subject: {
    id: number;
    name: string;
    color: string;
    icon: string;
    total_chapters: number;
    completed_chapters: number;
    in_progress_chapters: number;
    total_study_minutes: number;
  };
  onRefresh: () => void;
}

export default function SubjectCard({ subject, onRefresh }: SubjectCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { deleteSubject, token } = useStore();
  const Icon = ICON_MAP[subject.icon] || ICON_MAP.book;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete ${subject.name} and all its data?`)) return;

    try {
      const res = await fetch(`/api/subjects/${subject.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        deleteSubject(subject.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const progress = subject.total_chapters > 0 
    ? (subject.completed_chapters / subject.total_chapters) * 100 
    : 0;

  const hours = Math.floor(subject.total_study_minutes / 60);
  const minutes = subject.total_study_minutes % 60;

  // Circular Progress Calculation
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card 
        className={cn(
          "overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-white/20 cursor-pointer group",
          isExpanded ? "ring-1 ring-white/10 bg-slate-900/60" : ""
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                style={{ backgroundColor: `${subject.color}20`, color: subject.color }}
              >
                <Icon size={24} />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-slate-100">{subject.name}</h3>
                <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                  <span className="flex items-center">
                    <Clock size={12} className="mr-1" />
                    {hours}h {minutes}m studied
                  </span>
                  <span>•</span>
                  <span>{subject.completed_chapters}/{subject.total_chapters} chapters</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Circular Progress */}
              <div className="relative w-14 h-14 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="28"
                    cy="28"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    className="text-slate-800"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r={radius}
                    stroke={subject.color}
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <span className="absolute text-xs font-bold">{Math.round(progress)}%</span>
              </div>

              <motion.div 
                animate={{ rotate: isExpanded ? 180 : 0 }}
                className="text-slate-500"
              >
                <ChevronDown size={20} />
              </motion.div>
            </div>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="pt-6 border-t border-white/5 mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Syllabus</h4>
                    <button 
                      onClick={handleDelete}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={12} className="mr-1" /> Delete Subject
                    </button>
                  </div>
                  <ChapterList 
                    subjectId={subject.id} 
                    subjectColor={subject.color} 
                    onUpdateStats={onRefresh}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
}
