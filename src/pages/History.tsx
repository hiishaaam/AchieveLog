import { useState, useEffect } from 'react';
import { Download, Trash2, History as HistoryIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import HistoryFilters from '@/components/history/HistoryFilters';
import SessionsTable from '@/components/history/SessionsTable';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useStore } from '@/store/useStore';
import { apiCall } from '@/lib/api';
import { useToast } from '@/store/useToast';

export default function History() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  const { token } = useStore();
  const { addToast } = useToast();

  const fetchSessions = async () => {
    if (!token) return;
    setIsLoading(true);
    
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: '20',
      ...filters
    });

    try {
      const data = await apiCall(`/api/history?${queryParams}`);
      setSessions(data.sessions);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [page, filters, token]);

  const handleBulkDelete = async () => {
    try {
      await apiCall('/api/sessions/bulk-delete', 'POST', { ids: selectedIds });
      addToast(`Deleted ${selectedIds.length} sessions`, 'success');
      setSelectedIds([]);
      fetchSessions();
    } catch (err) {
      console.error(err);
      addToast('Failed to delete sessions', 'error');
    }
  };

  const handleExport = () => {
    // Simple CSV export logic
    const headers = ['Date', 'Subject', 'Chapter', 'Topics', 'Duration (min)', 'Confidence', 'Mood', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...sessions.map(s => [
        s.date,
        `"${s.subject_name}"`,
        `"${s.chapter}"`,
        `"${s.topics.join('; ')}"`,
        s.duration_minutes,
        s.confidence_rating,
        s.mood,
        `"${s.notes || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `achievelog_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Session History
          </h1>
          <p className="text-slate-400 mt-1">Review and manage your study logs</p>
        </div>
        
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={() => setIsBulkDeleteOpen(true)}
              className="animate-in fade-in zoom-in"
            >
              <Trash2 size={16} className="mr-2" /> Delete ({selectedIds.length})
            </Button>
          )}
          <Button variant="outline" onClick={handleExport} disabled={sessions.length === 0}>
            <Download size={16} className="mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <HistoryFilters onFilterChange={(newFilters) => { setFilters(newFilters); setPage(1); }} />

      {sessions.length > 0 ? (
        <>
          <SessionsTable 
            sessions={sessions} 
            onRefresh={fetchSessions} 
            onSelectionChange={setSelectedIds}
            selectedIds={selectedIds}
          />
          
          {/* Pagination */}
          <div className="flex justify-between items-center pt-4">
            <span className="text-sm text-slate-500">
              Showing {sessions.length} of {total} sessions
            </span>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                disabled={page === 1} 
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <Button 
                variant="ghost" 
                disabled={page * 20 >= total} 
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : (
        !isLoading && (
          <EmptyState
            icon={HistoryIcon}
            title="No sessions found"
            description="Try adjusting your filters or log a new study session to see it here."
          />
        )
      )}

      <ConfirmModal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title="Bulk Delete"
        message={`Are you sure you want to delete ${selectedIds.length} sessions? This action cannot be undone.`}
        confirmLabel="Delete All"
        isDestructive
      />
    </div>
  );
}
