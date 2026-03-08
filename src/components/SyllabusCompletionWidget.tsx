import { motion } from 'motion/react';
import { Card } from '@/components/ui/Card';

interface SyllabusCompletionWidgetProps {
  subjects: Array<{
    id: number;
    name: string;
    color: string;
    total_chapters: number;
    completed_chapters: number;
  }>;
}

export default function SyllabusCompletionWidget({ subjects }: SyllabusCompletionWidgetProps) {
  const totalChapters = subjects.reduce((acc, sub) => acc + sub.total_chapters, 0);
  const totalCompleted = subjects.reduce((acc, sub) => acc + sub.completed_chapters, 0);
  
  const overallPercentage = totalChapters > 0 
    ? Math.round((totalCompleted / totalChapters) * 100) 
    : 0;

  return (
    <Card className="p-6 mb-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      <div className="relative z-10">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Overall Syllabus Completion</h2>
            <p className="text-slate-400">You've covered <span className="text-blue-400 font-bold">{overallPercentage}%</span> of your total syllabus</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-white">{totalCompleted}</span>
            <span className="text-slate-500 text-sm ml-1">/ {totalChapters} chapters</span>
          </div>
        </div>

        {/* Multi-colored Progress Bar */}
        <div className="h-4 bg-slate-800 rounded-full overflow-hidden flex w-full">
          {subjects.map((subject) => {
            const width = totalChapters > 0 
              ? (subject.completed_chapters / totalChapters) * 100 
              : 0;
            
            if (width === 0) return null;

            return (
              <motion.div
                key={subject.id}
                initial={{ width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                style={{ backgroundColor: subject.color }}
                className="h-full first:rounded-l-full last:rounded-r-full relative group"
              >
                {/* Tooltip on hover */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-xs px-2 py-1 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                  {subject.name}: {subject.completed_chapters}
                </div>
              </motion.div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4">
          {subjects.filter(s => s.completed_chapters > 0).map(subject => (
            <div key={subject.id} className="flex items-center text-xs text-slate-400">
              <div 
                className="w-2 h-2 rounded-full mr-2" 
                style={{ backgroundColor: subject.color }} 
              />
              {subject.name}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
