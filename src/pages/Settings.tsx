import { useState, useEffect } from 'react';
import { Save, User, Moon, Database, AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useStore } from '@/store/useStore';
import { fetchSettings, updateSettings } from '@/lib/supabaseApi';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/store/useToast';
import { COLOR_PALETTE } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function Settings() {
  const [settings, setSettings] = useState({
    display_name: '',
    daily_goal: 4,
    weekly_goal: 20,
    theme: 'dark',
    accent_color: 'blue'
  });
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { user, logout } = useStore();
  const { addToast } = useToast();

  useEffect(() => {
    if (user) {
      fetchSettings(user.id)
        .then(data => {
          if (data) setSettings({
            display_name: data.display_name || '',
            daily_goal: data.daily_goal_minutes ? data.daily_goal_minutes / 60 : 4,
            weekly_goal: 20,
            theme: data.theme || 'dark',
            accent_color: 'blue'
          });
        })
        .catch(console.error);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      await updateSettings(user.id, {
        display_name: settings.display_name,
        daily_goal_minutes: settings.daily_goal * 60,
        theme: settings.theme,
      });
      addToast('Settings saved successfully', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to save settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = async () => {
    if (!user) return;
    try {
      await supabase.from('study_sessions').delete().eq('user_id', user.id);
      await supabase.from('chapters').delete().eq('user_id', user.id);
      await supabase.from('subjects').delete().eq('user_id', user.id);
      await supabase.from('exam_targets').delete().eq('user_id', user.id);
      addToast('All data cleared', 'success');
      window.location.reload();
    } catch (err) {
      console.error(err);
      addToast('Failed to clear data', 'error');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-slate-400 mt-1">Customize your experience</p>
      </div>

      {/* Profile Section */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <User className="text-blue-400" size={24} />
          <h2 className="text-xl font-semibold">Profile & Goals</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">Display Name</label>
            <Input 
              value={settings.display_name || ''} 
              onChange={e => setSettings({...settings, display_name: e.target.value})}
              placeholder="Enter your name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">Daily Study Goal (Hours)</label>
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="1" 
                max="12" 
                value={settings.daily_goal} 
                onChange={e => setSettings({...settings, daily_goal: Number(e.target.value)})}
                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="w-12 text-center font-mono text-lg">{settings.daily_goal}h</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Appearance Section */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <Moon className="text-violet-400" size={24} />
          <h2 className="text-xl font-semibold">Appearance</h2>
        </div>

        <div>
          <label className="block text-sm font-medium mb-3 text-slate-300">Accent Color</label>
          <div className="flex flex-wrap gap-3">
            {COLOR_PALETTE.slice(0, 8).map((color) => (
              <button
                key={color.value}
                onClick={() => setSettings({...settings, accent_color: color.name.toLowerCase()})}
                className={cn(
                  "w-10 h-10 rounded-full transition-all relative border-2",
                  settings.accent_color === color.name.toLowerCase() 
                    ? "border-white scale-110" 
                    : "border-transparent hover:scale-105"
                )}
                style={{ backgroundColor: color.value }}
              >
                {settings.accent_color === color.name.toLowerCase() && (
                  <Check size={16} className="text-white absolute inset-0 m-auto drop-shadow-md" />
                )}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Data Management */}
      <Card className="p-6 space-y-6 border-red-500/20 bg-red-500/5">
        <div className="flex items-center gap-3 border-b border-red-500/20 pb-4">
          <Database className="text-red-400" size={24} />
          <h2 className="text-xl font-semibold text-red-100">Data Management</h2>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-medium text-red-200">Clear All Data</h3>
            <p className="text-sm text-red-300/70">Permanently delete all subjects, sessions, and exams.</p>
          </div>
          <Button variant="destructive" onClick={() => setIsClearModalOpen(true)}>
            <AlertTriangle size={16} className="mr-2" /> Clear Data
          </Button>
        </div>
      </Card>

      <div className="flex justify-end gap-4 pt-4">
        <Button variant="ghost" onClick={logout}>Log Out</Button>
        <Button onClick={handleSave} variant="accent" disabled={isLoading} className="px-8">
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <ConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleClearData}
        title="Clear All Data?"
        message="This action cannot be undone. All your study history, subjects, and exam targets will be permanently deleted."
        confirmLabel="Yes, Clear Everything"
        isDestructive
      />
    </div>
  );
}
