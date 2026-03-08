import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-white/5">
        <Icon size={40} className="text-slate-500" />
      </div>
      <h3 className="text-xl font-bold text-slate-200 mb-2">{title}</h3>
      <p className="text-slate-400 max-w-sm mb-8">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="outline" className="border-dashed border-white/20 hover:border-white/40">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
