import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setUser } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const allowedUsers = ['liyananaduvil@gmail.com', 'hishamaju189@gmail.com'];
    if (!allowedUsers.includes(email.toLowerCase())) {
      setError("Unauthorized access. You do not have permission to use this application.");
      setIsLoading(false);
      return;
    }

    try {
      if (isRegistering) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (signUpError) throw signUpError;
        
        if (data.user) {
          // Attempt to create a base profile. Often done via Supabase triggers but we handle it here.
          const username = email.split('@')[0];
          await supabase.from('profiles').insert({
            id: data.user.id,
            username,
            display_name: username
          }).select().single(); // Try insert, ignore if exists
          
          if (data.session) {
            setUser({ ...data.user, username, display_name: username }, data.session.access_token);
          } else {
             setError("Success! Please check your email to confirm your account.");
             setIsLoading(false);
             return;
          }
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        
        if (data.user && data.session) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
          setUser({ ...data.user, ...profile }, data.session.access_token);
        }
      }

      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent mb-2">
              AchieveLog
            </h1>
            <p className="text-slate-400">
              {isRegistering ? 'Create your account' : 'Welcome back'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                  placeholder="Enter your email address"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                  placeholder="Enter 6+ characters"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-medium py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isRegistering ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
