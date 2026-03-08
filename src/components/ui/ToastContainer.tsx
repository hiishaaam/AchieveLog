import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useToast } from '@/store/useToast';
import { cn } from '@/lib/utils';

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            layout
            className={cn(
              "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md min-w-[300px]",
              toast.type === 'success' && "bg-green-500/10 border-green-500/20 text-green-200",
              toast.type === 'error' && "bg-red-500/10 border-red-500/20 text-red-200",
              toast.type === 'warning' && "bg-amber-500/10 border-amber-500/20 text-amber-200",
              toast.type === 'info' && "bg-blue-500/10 border-blue-500/20 text-blue-200"
            )}
          >
            {toast.type === 'success' && <CheckCircle size={18} className="text-green-400" />}
            {toast.type === 'error' && <AlertCircle size={18} className="text-red-400" />}
            {toast.type === 'warning' && <AlertCircle size={18} className="text-amber-400" />}
            {toast.type === 'info' && <Info size={18} className="text-blue-400" />}
            
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            
            <button 
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
