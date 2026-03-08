import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ICON_MAP, COLOR_PALETTE } from '@/lib/constants';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { apiCall } from '@/lib/api';

interface AddSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddSubjectModal({ isOpen, onClose }: AddSubjectModalProps) {
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('book');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0].value);
  const [totalChapters, setTotalChapters] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { addSubject, token } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const newSubject = await apiCall('/api/subjects', 'POST', {
        name,
        icon: selectedIcon,
        color: selectedColor,
        total_syllabus_chapters: totalChapters
      });

      addSubject({
        ...newSubject,
        total_chapters: totalChapters, // Optimistic update
        completed_chapters: 0,
        in_progress_chapters: 0,
        total_study_minutes: 0
      });
      onClose();
      setName('');
      setTotalChapters(0);
    } catch (error) {
      console.error('Failed to add subject', error);
    } finally {
      setIsLoading(false);
    }
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
                <h2 className="text-2xl font-bold">Add New Subject</h2>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-300">Subject Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Physics, Organic Chemistry"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-300">Total Chapters (Optional)</label>
                  <Input
                    type="number"
                    min="0"
                    value={totalChapters || ''}
                    onChange={(e) => setTotalChapters(parseInt(e.target.value) || 0)}
                    placeholder="Auto-generate placeholder chapters"
                  />
                  <p className="text-xs text-slate-500 mt-1">Enter a number to auto-create chapters (e.g. Chapter 1, Chapter 2...)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-300">Icon</label>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.entries(ICON_MAP).map(([key, Icon]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedIcon(key)}
                        className={cn(
                          "p-3 rounded-xl flex items-center justify-center transition-all",
                          selectedIcon === key 
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105" 
                            : "bg-slate-800/50 hover:bg-slate-800 text-slate-400"
                        )}
                      >
                        <Icon size={20} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-300">Color</label>
                  <div className="grid grid-cols-8 gap-2">
                    {COLOR_PALETTE.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setSelectedColor(color.value)}
                        className={cn(
                          "w-8 h-8 rounded-full transition-all relative",
                          selectedColor === color.value ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110" : "hover:scale-105"
                        )}
                        style={{ backgroundColor: color.value }}
                      >
                        {selectedColor === color.value && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Check size={12} className="text-white drop-shadow-md" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                  <Button type="submit" variant="accent" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Subject'}
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
