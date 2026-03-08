import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Edit2, Trash2, Save, X, CheckSquare, Square } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToast } from '@/store/useToast';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/dateUtils';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { supabase } from '@/lib/supabase';
import { deleteSession } from '@/lib/supabaseApi';

interface SessionsTableProps {
  sessions: any[];
  onRefresh: () => void;
  onSelectionChange: (ids: number[]) => void;
  selectedIds: number[];
}

export default function SessionsTable({ sessions, onRefresh, onSelectionChange, selectedIds }: SessionsTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [deleteId, setDeleteId] = useState<number | null>(null);
  
  const { user } = useStore();
  const { addToast } = useToast();

  const handleEdit = (session: any) => {
    setEditingId(session.id);
    setEditForm({
      ...session,
      topics: (session.topics || []).join(', ')
    });
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      const payload = {
        ...editForm,
        topics: editForm.topics.split(',').map((t: string) => t.trim()).filter(Boolean)
      };

      const { error } = await supabase
        .from('study_sessions')
        .update({
          date: payload.date,
          topics: payload.topics,
          duration_minutes: payload.duration_minutes,
          confidence_rating: payload.confidence_rating,
        })
        .eq('id', editingId)
        .eq('user_id', user.id);

      if (error) throw error;

      addToast('Session updated', 'success');
      setEditingId(null);
      onRefresh();
    } catch (err) {
      console.error(err);
      addToast('Error updating session', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !user) return;
    try {
      await deleteSession(deleteId, user.id);
      addToast('Session deleted', 'success');
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === sessions.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(sessions.map(s => s.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(sid => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-900/80 text-slate-400 uppercase text-xs backdrop-blur-sm">
            <tr>
              <th className="px-4 py-3 w-10">
                <button onClick={toggleSelectAll} className="text-slate-400 hover:text-white">
                  {sessions.length > 0 && selectedIds.length === sessions.length ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
              </th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Chapter / Topics</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-slate-900/30">
            {sessions.map((session) => (
              <tr key={session.id} className={cn("hover:bg-white/5 transition-colors", editingId === session.id && "bg-blue-900/10")}>
                <td className="px-4 py-3">
                  <button onClick={() => toggleSelect(session.id)} className="text-slate-400 hover:text-white">
                    {selectedIds.includes(session.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </td>
                
                {editingId === session.id ? (
                  // Edit Mode
                  <>
                    <td className="px-4 py-3">
                      <input 
                        type="date" 
                        value={editForm.date} 
                        onChange={e => setEditForm({...editForm, date: e.target.value})}
                        className="bg-slate-800 border border-white/10 rounded px-2 py-1 text-xs w-24"
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-400">{session.subject_name}</td>
                    <td className="px-4 py-3">
                      <input 
                        value={editForm.chapter} 
                        onChange={e => setEditForm({...editForm, chapter: e.target.value})}
                        className="bg-slate-800 border border-white/10 rounded px-2 py-1 text-xs w-full mb-1"
                        placeholder="Chapter"
                      />
                      <input 
                        value={editForm.topics} 
                        onChange={e => setEditForm({...editForm, topics: e.target.value})}
                        className="bg-slate-800 border border-white/10 rounded px-2 py-1 text-xs w-full"
                        placeholder="Topics (comma separated)"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input 
                        type="number"
                        value={editForm.duration_minutes} 
                        onChange={e => setEditForm({...editForm, duration_minutes: Number(e.target.value)})}
                        className="bg-slate-800 border border-white/10 rounded px-2 py-1 text-xs w-16"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select 
                        value={editForm.confidence_rating}
                        onChange={e => setEditForm({...editForm, confidence_rating: Number(e.target.value)})}
                        className="bg-slate-800 border border-white/10 rounded px-2 py-1 text-xs"
                      >
                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}★</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={handleSave} className="p-1 text-green-400 hover:bg-green-500/10 rounded"><Save size={16} /></button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-white/10 rounded"><X size={16} /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  // View Mode
                  <>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-300">
                      {format(parseISO(session.date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: session.subject_color }} />
                        <span className="font-medium text-slate-200">{session.subject_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-200">{session.chapter}</div>
                      <div className="text-xs text-slate-500 truncate max-w-[200px]">
                        {session.topics.join(', ')}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">
                      {formatDuration(session.duration_minutes)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`w-1.5 h-1.5 rounded-full mr-0.5 ${i < session.confidence_rating ? 'bg-blue-400' : 'bg-slate-700'}`} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(session)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => setDeleteId(session.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No sessions found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Session"
        message="Are you sure you want to delete this study session? This action cannot be undone."
        confirmLabel="Delete"
        isDestructive
      />
    </>
  );
}
