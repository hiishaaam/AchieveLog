import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Plus, Check, Circle, Clock } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { fetchChapters as fetchChaptersApi, createChapter, updateChapter as updateChapterApi, deleteChapter as deleteChapterApi } from '@/lib/supabaseApi';

interface Chapter {
  id: number;
  subject_id: number;
  name: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
}

interface ChapterListProps {
  subjectId: number;
  subjectColor: string;
  onUpdateStats: () => void;
}

export default function ChapterList({ subjectId, subjectColor, onUpdateStats }: ChapterListProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [newChapterName, setNewChapterName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { user } = useStore();

  useEffect(() => {
    loadChapters();
  }, [subjectId]);

  const statusDbToUi: Record<string, string> = {
    'not_started': 'Not Started',
    'in_progress': 'In Progress',
    'completed': 'Completed',
  };

  const loadChapters = async () => {
    if (!user) return;
    try {
      const data = await fetchChaptersApi(subjectId, user.id);
      // Map DB status to UI status
      setChapters(data.map((c: any) => ({ ...c, status: statusDbToUi[c.status] || c.status })));
    } catch (err) {
      console.error(err);
    }
  };

  const addChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterName.trim() || !user) return;

    try {
      const newChapter = await createChapter(subjectId, user.id, newChapterName);
      setChapters([...chapters, { ...newChapter, status: statusDbToUi[newChapter.status] || newChapter.status }]);
      setNewChapterName('');
      setIsAdding(false);
      onUpdateStats();
    } catch (err) {
      console.error(err);
    }
  };

  const updateStatus = async (chapter: Chapter) => {
    if (!user) return;
    const statusOrder = ['Not Started', 'In Progress', 'Completed'] as const;
    const currentIndex = statusOrder.indexOf(chapter.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

    // Optimistic update
    const updatedChapters = chapters.map(c => 
      c.id === chapter.id ? { ...c, status: nextStatus } : c
    );
    setChapters(updatedChapters);

    try {
      await updateChapterApi(chapter.id, user.id, { status: nextStatus });
      onUpdateStats();
    } catch (err) {
      console.error(err);
      loadChapters();
    }
  };

  const updateName = async (id: number, name: string) => {
    if (!user) return;
    try {
      await updateChapterApi(id, user.id, { name });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteChapter = async (id: number) => {
    if (!confirm('Delete this chapter?')) return;
    if (!user) return;
    
    try {
      await deleteChapterApi(id, user.id);
      setChapters(chapters.filter(c => c.id !== id));
      onUpdateStats();
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'In Progress': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-slate-700/30 text-slate-400 border-white/5';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <Check size={14} />;
      case 'In Progress': return <Clock size={14} />;
      default: return <Circle size={14} />;
    }
  };

  const notStartedCount = chapters.filter(c => c.status === 'Not Started').length;
  const inProgressCount = chapters.filter(c => c.status === 'In Progress').length;
  const completedCount = chapters.filter(c => c.status === 'Completed').length;
  const total = chapters.length;

  return (
    <div className="mt-6 space-y-4">
      {/* Quick Stats Bar */}
      {total > 0 && (
        <div className="flex h-2 rounded-full overflow-hidden bg-slate-800">
          <div style={{ width: `${(completedCount / total) * 100}%` }} className="bg-green-500 transition-all duration-500" />
          <div style={{ width: `${(inProgressCount / total) * 100}%` }} className="bg-amber-500 transition-all duration-500" />
          <div style={{ width: `${(notStartedCount / total) * 100}%` }} className="bg-slate-700 transition-all duration-500" />
        </div>
      )}

      <div className="space-y-2">
        <AnimatePresence>
          {chapters.map((chapter) => (
            <motion.div
              key={chapter.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="group flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"
            >
              <div className="flex-1 mr-4">
                <input
                  defaultValue={chapter.name}
                  onBlur={(e) => updateName(chapter.id, e.target.value)}
                  className="bg-transparent border-none focus:ring-0 w-full text-sm font-medium text-slate-200 placeholder-slate-500"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => updateStatus(chapter)}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium border transition-all",
                    getStatusColor(chapter.status)
                  )}
                >
                  {chapter.status === 'Completed' && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="inline-block"
                    >
                      <Check size={12} />
                    </motion.span>
                  )}
                  <span>{chapter.status}</span>
                </button>

                <button
                  onClick={() => handleDeleteChapter(chapter.id)}
                  className="p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {isAdding ? (
        <form onSubmit={addChapter} className="flex items-center space-x-2 animate-in fade-in slide-in-from-top-2">
          <Input
            value={newChapterName}
            onChange={(e) => setNewChapterName(e.target.value)}
            placeholder="Chapter Name"
            className="h-9"
            autoFocus
          />
          <Button type="submit" size="sm" variant="accent">Add</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
        </form>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="w-full border-dashed border-white/20 hover:border-white/40 text-slate-400"
          onClick={() => setIsAdding(true)}
        >
          <Plus size={16} className="mr-2" /> Add Chapter
        </Button>
      )}
    </div>
  );
}
