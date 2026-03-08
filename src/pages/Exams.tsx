import { useState, useEffect } from 'react';
import { Plus, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import ExamCard from '@/components/exams/ExamCard';
import AddExamModal from '@/components/exams/AddExamModal';
import PreparationInsights from '@/components/exams/PreparationInsights';
import EmptyState from '@/components/ui/EmptyState';
import { useStore } from '@/store/useStore';
import { fetchExams as fetchExamsApi, fetchSubjects as fetchSubjectsApi } from '@/lib/supabaseApi';

export default function Exams() {
  const [exams, setExams] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user, subjects, setSubjects } = useStore();

  const fetchExams = async () => {
    if (!user) return;
    try {
      const data = await fetchExamsApi(user.id);
      setExams(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Ensure subjects are loaded for the modal
  const loadSubjects = async () => {
    if (!user || subjects.length > 0) return;
    try {
      const data = await fetchSubjectsApi(user.id);
      setSubjects(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchExams();
    loadSubjects();
  }, [user]);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Exam Targets
          </h1>
          <p className="text-slate-400 mt-1">Track your countdown and syllabus coverage</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="accent" className="shadow-lg shadow-blue-500/20">
          <Plus className="mr-2 h-4 w-4" /> Add Exam
        </Button>
      </div>

      {exams.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => (
              <ExamCard key={exam.id} exam={exam} onRefresh={fetchExams} />
            ))}
          </div>
          
          <PreparationInsights exams={exams} />
        </>
      ) : (
        !isLoading && (
          <EmptyState
            icon={Calendar}
            title="No exams targeted yet"
            description="Set an exam date and link subjects to track your syllabus completion against the deadline."
            actionLabel="Set Exam Target"
            onAction={() => setIsModalOpen(true)}
          />
        )
      )}

      <AddExamModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchExams}
      />
    </div>
  );
}
