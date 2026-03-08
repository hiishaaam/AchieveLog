import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import SubjectCard from '@/components/SubjectCard';
import AddSubjectModal from '@/components/AddSubjectModal';
import SyllabusCompletionWidget from '@/components/SyllabusCompletionWidget';
import { useStore } from '@/store/useStore';
import { fetchSubjects } from '@/lib/supabaseApi';

export default function Subjects() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { subjects, setSubjects, user } = useStore();
  const [isLoading, setIsLoading] = useState(true);

  const loadSubjects = async () => {
    if (!user) return;
    try {
      const data = await fetchSubjects(user.id);
      setSubjects(data);
    } catch (error) {
      console.error('Failed to fetch subjects', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, [user]);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Your Subjects
          </h1>
          <p className="text-slate-400 mt-1">Manage your syllabus and track progress</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="accent" className="shadow-lg shadow-blue-500/20">
          <Plus className="mr-2 h-4 w-4" /> Add Subject
        </Button>
      </div>

      {subjects.length > 0 ? (
        <>
          <SyllabusCompletionWidget subjects={subjects} />
          
          <div className="grid grid-cols-1 gap-6">
            {subjects.map((subject) => (
              <SubjectCard 
                key={subject.id} 
                subject={subject} 
                onRefresh={loadSubjects}
              />
            ))}
          </div>
        </>
      ) : (
        !isLoading && (
          <div className="text-center py-20 glass-card rounded-2xl border-dashed border-2 border-white/10">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus size={32} className="text-slate-500" />
            </div>
            <h3 className="text-xl font-semibold text-slate-200">No subjects yet</h3>
            <p className="text-slate-400 mt-2 mb-6 max-w-sm mx-auto">
              Add your first subject to start building your syllabus tree and tracking your progress.
            </p>
            <Button onClick={() => setIsModalOpen(true)} variant="outline">
              Get Started
            </Button>
          </div>
        )
      )}

      <AddSubjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
