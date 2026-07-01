import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, LogIn, AlertCircle, Loader2 } from 'lucide-react';

export const LoginPage = () => {
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(identifier, password);
    if (error) setError('الاسم/الإيميل أو كلمة المرور غير صحيحة');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#060a12] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-600/6 rounded-full blur-[100px]" />
        <div className="absolute top-0 left-1/4 w-[300px] h-[300px] bg-rose-600/5 rounded-full blur-[80px]" />
      </div>

      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-md relative"
      >
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8 backdrop-blur-xl shadow-[0_0_80px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05)]">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-[0_0_30px_rgba(147,51,234,0.5)]"
            >
              <span className="text-2xl font-black text-white">M</span>
            </motion.div>
            <h1 className="text-2xl font-black text-white tracking-tight">Marketing & Video</h1>
            <p className="text-sm text-white/40 mt-1 font-medium">Operations Hub</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-white/50 uppercase tracking-widest">
                الاسم أو البريد الإلكتروني
              </label>
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                required
                autoComplete="username"
                placeholder="eslam أو name@company.com"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/25 text-sm font-medium focus:outline-none focus:border-purple-500/60 focus:bg-white/[0.08] focus:shadow-[0_0_20px_rgba(147,51,234,0.15)] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-white/50 uppercase tracking-widest">
                كلمة المرور (اختياري)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="اتركها فاضية للدخول بالاسم فقط"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/25 text-sm font-medium focus:outline-none focus:border-purple-500/60 focus:bg-white/[0.08] focus:shadow-[0_0_20px_rgba(147,51,234,0.15)] transition-all pr-4 pl-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm"
                >
                  <AlertCircle size={16} className="shrink-0" />
                  <span className="font-medium arabic-text">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black text-sm tracking-wide shadow-[0_0_30px_rgba(147,51,234,0.4)] hover:shadow-[0_0_40px_rgba(147,51,234,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <LogIn size={16} />
                  <span>تسجيل الدخول</span>
                </>
              )}
            </motion.button>
          </form>

          <p className="text-center text-[11px] text-white/20 mt-6 font-medium">
            يمكنك الدخول بالاسم فقط أو بالاسم مع كلمة مرور
          </p>
        </div>
      </motion.div>
    </div>
  );
};
