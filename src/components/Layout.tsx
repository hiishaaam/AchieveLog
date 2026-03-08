import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, BookOpen, History, BarChart2, Calendar, Settings, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/log', label: 'Log', icon: PlusCircle },
  { path: '/subjects', label: 'Subjects', icon: BookOpen },
  { path: '/history', label: 'History', icon: History },
  { path: '/analytics', label: 'Analytics', icon: BarChart2 },
  { path: '/exams', label: 'Exams', icon: Calendar },
  { path: '/settings', label: 'Settings', icon: Settings },
];

import ToastContainer from './ui/ToastContainer';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 text-slate-100 overflow-hidden">
      <ToastContainer />
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 glass-card m-2 rounded-xl z-50 sticky top-2">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
          AchieveLog
        </h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 glass-button rounded-lg">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-0 z-40 bg-slate-950/95 backdrop-blur-xl pt-24 px-6"
          >
            <nav className="flex flex-col space-y-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center space-x-4 p-4 rounded-xl transition-all",
                      isActive ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "hover:bg-white/5"
                    )}
                  >
                    <Icon size={24} />
                    <span className="text-lg font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 p-4 h-screen sticky top-0">
        <div className="glass-card h-full rounded-2xl flex flex-col p-4">
          <div className="mb-8 px-2">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              AchieveLog
            </h1>
          </div>
          
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-xl transition-all group",
                    isActive 
                      ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10" 
                      : "hover:bg-white/5 text-slate-400 hover:text-slate-200"
                  )}
                >
                  <Icon size={20} className={cn("transition-colors", isActive ? "text-blue-400" : "group-hover:text-white")} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-4 border-t border-white/10">
            <div className="flex items-center space-x-3 p-2 rounded-xl bg-white/5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500" />
              <div>
                <p className="text-sm font-medium">Student</p>
                <p className="text-xs text-slate-400">Pro Plan</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen p-4 md:p-6 pb-24 md:pb-6">
        <div className="max-w-5xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav (Optional, but good for quick actions) */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 glass-card rounded-2xl p-2 flex justify-around items-center z-30 border border-white/10 shadow-2xl">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "p-3 rounded-xl transition-all",
                isActive ? "bg-blue-600/20 text-blue-400" : "text-slate-400"
              )}
            >
              <Icon size={24} />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
