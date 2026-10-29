import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  Sun,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface LoginModalProps {
  onSuccess?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onSuccess }) => {
  const { login } = useProject();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please provide your valid official email and security password.');
      return;
    }

    const success = login(email.trim(), password.trim());
    if (success) {
      if (onSuccess) onSuccess();
    } else {
      setError('Authentication failed. Please verify your credentials.');
    }
  };

  return (
    <div className="fixed inset-0 bg-graphite-950/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-graphite-900 to-graphite-950 border border-graphite-750 w-full max-w-md rounded-2xl shadow-2xl p-8 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Branding */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-graphite-950 font-black mx-auto mb-3">
            <Sun className="w-7 h-7 text-graphite-950 stroke-[2.5]" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">SWELECT Project Control</h2>
          <p className="text-xs text-slate-400 mt-1">
            Ground-Mounted Solar EPC Execution & Scheduling Platform
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1.5">
              Official Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                placeholder="name@swelectes.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-graphite-850 border border-graphite-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase">
                Password *
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-[11px] text-cyan-400 hover:underline font-medium"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-graphite-850 border border-graphite-700 rounded-xl pl-9 pr-10 py-2.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-graphite-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 mt-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Secure Enterprise Sign In</span>
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-graphite-800 text-center">
          <p className="text-[10px] text-slate-500">
            SWELECT Energy Systems Limited • EPC Project Control System
          </p>
        </div>

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="absolute inset-0 bg-graphite-950/95 backdrop-blur-md p-6 flex flex-col justify-between z-20">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm mb-2">
                <HelpCircle className="w-4 h-4" />
                <span>Password Recovery Assistance</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                For security reasons in Solar EPC project control systems, password resets are governed by corporate IT policy. Please contact your SWELECT IT Administrator or email <span className="text-cyan-400 font-mono">support.it@swelectes.com</span> with your Employee ID.
              </p>
            </div>
            <button
              onClick={() => setShowForgotPassword(false)}
              className="w-full py-2 rounded-xl bg-graphite-800 text-slate-200 text-xs font-semibold"
            >
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
