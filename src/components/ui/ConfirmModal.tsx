import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  isDestructive?: boolean;
}

export default function ConfirmModal({ 
  isOpen, onClose, onConfirm, title, message, 
  confirmLabel = 'Confirm', isDestructive = false 
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-[60] pointer-events-none"
          >
            <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md m-4 p-6 pointer-events-auto">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-amber-500/10 rounded-full">
                  <AlertTriangle size={24} className="text-amber-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{message}</p>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button 
                  variant={isDestructive ? 'destructive' : 'default'} 
                  onClick={() => { onConfirm(); onClose(); }}
                >
                  {confirmLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
