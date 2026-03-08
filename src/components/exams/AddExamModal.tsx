import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useStore } from '@/store/useStore';
import { useToast } from '@/store/useToast';
import { cn } from '@/lib/utils';

interface AddExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddExamModal({ isOpen, onClose, onSuccess }: AddExamModalProps) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { subjects, token } = useStore();
  const { addToast } = useToast();

  // Fetch subjects if not already loaded (though they usually are)
  useEffect(() => {
    if (subjects.length === 0 && token) {
      // Trigger fetch if needed, but for now assume store has them or parent fetched them
    }
  }, [subjects, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          exam_date: date,
          subjects: selectedSubjects
        })
      });

      if (response.ok) {
        addToast('Exam target added successfully', 'success');
        onSuccess();
        onClose();
        setName('');
        setDate('');
        setSelectedSubjects([]);
      } else {
        addToast('Failed to add exam', 'error');
      }
    } catch (error) {
      console.error(error);
      addToast('An error occurred', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSubject = (id: number) => {
    setSelectedSubjects(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg m-4 p-6 pointer-events-auto max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Add Exam Target</h2>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-300">Exam Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. JEE Mains 2025"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-300">Exam Date</label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="pl-10"
                    />
                    <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-300">Link Subjects</label>
                  <p className="text-xs text-slate-500 mb-3">Select subjects included in this exam to track syllabus coverage.</p>
                  
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2">
                    {subjects.map((subject) => (
                      <button
                        key={subject.id}
                        type="button"
                        onClick={() => toggleSubject(subject.id)}
                        className={cn(
                          "flex items-center p-2 rounded-lg border text-sm transition-all",
                          selectedSubjects.includes(subject.id)
                            ? "bg-blue-600/20 border-blue-500/50 text-blue-200"
                            : "bg-slate-800/50 border-white/5 text-slate-400 hover:bg-slate-800"
                        )}
                      >
                        <div 
                          className="w-2 h-2 rounded-full mr-2" 
                          style={{ backgroundColor: subject.color }} 
                        />
                        <span className="truncate">{subject.name}</span>
                      </button>
                    ))}
                  </div>
                  {subjects.length === 0 && (
                    <p className="text-sm text-slate-500 italic">No subjects available. Add subjects first.</p>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                  <Button type="submit" variant="accent" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Set Target'}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
