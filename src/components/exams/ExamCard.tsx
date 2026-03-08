import { differenceInDays, parseISO, format } from 'date-fns';
import { motion } from 'motion/react';
import { Trash2, Calendar, BookOpen } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { useToast } from '@/store/useToast';
import { deleteExam } from '@/lib/supabaseApi';

interface ExamCardProps {
  exam: any;
  onRefresh: () => void;
}

export default function ExamCard({ exam, onRefresh }: ExamCardProps) {
  const { user } = useStore();
  const { addToast } = useToast();

  const daysRemaining = differenceInDays(parseISO(exam.exam_date), new Date());
  
  const getUrgencyColor = (days: number) => {
    if (days < 30) return 'text-red-400';
    if (days < 60) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const handleDelete = async () => {
    if (!confirm('Delete this exam target?')) return;
    if (!user) return;
    try {
      await deleteExam(exam.id, user.id);
      addToast('Exam deleted', 'success');
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Circular Progress
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (exam.progress / 100) * circumference;

  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-6 relative group overflow-hidden">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">{exam.name}</h3>
            <div className="flex items-center text-slate-400 text-sm">
              <Calendar size={14} className="mr-1" />
              {format(parseISO(exam.exam_date), 'MMMM d, yyyy')}
            </div>
          </div>
          
          <button 
            onClick={handleDelete}
            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={18} />
          </button>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <div className={cn("text-4xl font-bold mb-1", getUrgencyColor(daysRemaining))}>
              {daysRemaining}
            </div>
            <div className="text-sm text-slate-400 uppercase tracking-wider font-medium">Days Remaining</div>
          </div>

          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke="#1e293b"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke="currentColor"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={cn("transition-all duration-1000 ease-out", getUrgencyColor(daysRemaining))}
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-xl font-bold block">{exam.progress}%</span>
              <span className="text-[10px] text-slate-500 uppercase">Coverage</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
            <BookOpen size={12} className="mr-1" /> Linked Subjects
          </h4>
          {exam.linked_subjects.length > 0 ? (
            exam.linked_subjects.map((sub: any) => (
              <div key={sub.id} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">{sub.name}</span>
                  <span className="text-slate-500">{sub.progress}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ width: `${sub.progress}%`, backgroundColor: sub.color }} 
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-600 italic">No subjects linked</p>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
