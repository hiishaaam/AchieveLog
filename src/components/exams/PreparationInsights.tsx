import { Card } from '@/components/ui/Card';
import { Lightbulb } from 'lucide-react';

interface PreparationInsightsProps {
  exams: any[];
}

export default function PreparationInsights({ exams }: PreparationInsightsProps) {
  if (exams.length === 0) return null;

  // Simple heuristic for insight (mock logic for now, can be enhanced with real velocity data)
  const nextExam = exams[0]; // Assumes sorted by date
  const coverage = nextExam.progress;
  
  let insight = "";
  if (coverage < 30) {
    insight = "You're just getting started. Focus on high-weightage chapters first to boost your score quickly.";
  } else if (coverage < 60) {
    insight = "You're making steady progress. Try to increase your daily study hours by 15% to reach 80% coverage comfortably.";
  } else {
    insight = "Excellent pace! You're on track to complete the syllabus with ample time for revision.";
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-blue-900/20 to-violet-900/20 border-blue-500/20">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-blue-500/20 rounded-full text-blue-400">
          <Lightbulb size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-blue-100 mb-1">Preparation Insights</h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            {insight}
          </p>
        </div>
      </div>
    </Card>
  );
}
