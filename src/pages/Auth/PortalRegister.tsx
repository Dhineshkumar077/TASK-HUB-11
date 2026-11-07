import React, { useState } from 'react';
import { Lock, ArrowRight, AlertCircle, UserCheck } from 'lucide-react';
import { PasswordInput } from '../../components/PasswordInput.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

interface PortalRegisterProps {
  portalRole: 'gig-host' | 'gig-partner' | 'service-seeker' | 'tech-partner';
  title: string;
  subtitle: string;
  accentColor: string;
  navigate: (path: string) => void;
}

export const PortalRegister: React.FC<PortalRegisterProps> = ({
  portalRole,
  title,
  subtitle,
  navigate,
}) => {
  const { register } = useAuth();

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !mobile.trim() || !password) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password and Confirm Password do not match.');
      return;
    }

    if (!termsAccepted || !privacyAccepted) {
      setError('You must accept both the Terms and Conditions and Privacy Policy.');
      return;
    }

    setIsLoading(true);

    try {
      await register(portalRole, {
        fullName: fullName.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        password,
        confirmPassword,
        isEmailVerified: true,
        isPhoneVerified: true,
        termsAccepted,
        privacyAccepted,
      });

      // Direct navigation to respective portal dashboard upon successful registration
      if (portalRole === 'gig-host') navigate('/host/dashboard');
      else if (portalRole === 'gig-partner') navigate('/partner/dashboard');
      else if (portalRole === 'service-seeker') navigate('/seeker/dashboard');
      else if (portalRole === 'tech-partner') navigate('/tech/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setIsLoading(false);
    }
  };

  const loginRoute =
    portalRole === 'gig-host'
      ? '/host/login'
      : portalRole === 'gig-partner'
      ? '/partner/login'
      : portalRole === 'service-seeker'
      ? '/seeker/login'
      : '/tech/login';

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative">
      <div className="max-w-xl w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative z-10 backdrop-blur-md">
        {/* Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-mono font-semibold text-slate-300">
            <Lock className="w-3 h-3 text-indigo-400" />
            Direct Account Registration
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Direct Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Full Legal Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address <span className="text-rose-400">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Mobile Number <span className="text-rose-400">*</span>
            </label>
            <input
              type="tel"
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition font-mono"
            />
          </div>

          {/* Password with Eye Toggle and Strength Policy Check */}
          <PasswordInput
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            showPolicyChecks={true}
            placeholder="Min 8 chars, 1 uppercase, 1 digit, 1 symbol"
          />

          {/* Confirm Password with Eye Toggle */}
          <PasswordInput
            label="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
          />

          {/* Terms & Conditions Acceptance */}
          <div className="space-y-3 pt-2 text-xs text-slate-400">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
              />
              <span>
                I agree to the <strong className="text-white">TaskHub Terms and Conditions</strong> for {title}.
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
              />
              <span>
                I have read and accept the <strong className="text-white">Privacy Policy</strong> and data processing standards.
              </span>
            </label>
          </div>

          {/* Submit: Direct Registration */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm transition shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? (
              'Creating Account...'
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                <span>Register as {title}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Login redirect */}
        <div className="mt-6 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <button
            onClick={() => navigate(loginRoute)}
            className="text-indigo-400 hover:text-indigo-300 font-semibold underline"
          >
            Sign in here
          </button>
        </div>
      </div>
    </div>
  );
};
