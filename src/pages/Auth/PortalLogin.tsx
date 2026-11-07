import React, { useState } from 'react';
import { Lock, ArrowRight, AlertCircle, ShieldAlert } from 'lucide-react';
import { PasswordInput } from '../../components/PasswordInput.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

interface PortalLoginProps {
  portalRole: 'gig-host' | 'gig-partner' | 'service-seeker' | 'tech-partner';
  title: string;
  subtitle: string;
  navigate: (path: string) => void;
}

export const PortalLogin: React.FC<PortalLoginProps> = ({
  portalRole,
  title,
  subtitle,
  navigate,
}) => {
  const { login } = useAuth();
  const [emailOrMobile, setEmailOrMobile] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(portalRole, { emailOrMobile, password });
      if (portalRole === 'gig-host') navigate('/host/dashboard');
      else if (portalRole === 'gig-partner') navigate('/partner/dashboard');
      else if (portalRole === 'service-seeker') navigate('/seeker/dashboard');
      else if (portalRole === 'tech-partner') navigate('/tech/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const registerRoute =
    portalRole === 'gig-host'
      ? '/host/register'
      : portalRole === 'gig-partner'
      ? '/partner/register'
      : portalRole === 'service-seeker'
      ? '/seeker/register'
      : '/tech/register';

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-mono font-semibold text-slate-300">
            <Lock className="w-3 h-3 text-indigo-400" />
            Dedicated Portal Access
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email or Mobile Number <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={emailOrMobile}
              onChange={(e) => setEmailOrMobile(e.target.value)}
              placeholder="e.g. name@domain.com or mobile"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <PasswordInput
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your account password"
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm transition shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 mt-4"
          >
            {isLoading ? 'Signing In...' : `Sign In to ${title}`}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-400">
          Need an account?{' '}
          <button
            onClick={() => navigate(registerRoute)}
            className="text-indigo-400 hover:text-indigo-300 font-semibold underline"
          >
            Register as {title.replace('Login', '')}
          </button>
        </div>
      </div>
    </div>
  );
};
