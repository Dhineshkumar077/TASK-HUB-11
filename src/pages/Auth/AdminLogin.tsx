import React, { useState, useEffect } from 'react';
import {
  Shield,
  KeyRound,
  ArrowRight,
  AlertCircle,
  Lock,
  Mail,
  Smartphone,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { PasswordInput } from '../../components/PasswordInput.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';

interface AdminLoginProps {
  navigate: (path: string) => void;
}

type AdminAuthView = 'LOGIN' | 'REGISTER' | 'FORGOT_REQUEST' | 'FORGOT_VERIFY';

export const AdminLogin: React.FC<AdminLoginProps> = ({ navigate }) => {
  const { adminLogin, adminRegister } = useAuth();

  // Navigation mode
  const [view, setView] = useState<AdminAuthView>('LOGIN');

  // Administrative Gateway Status (Single Admin Limit Enforcement)
  const [adminStatus, setAdminStatus] = useState<{
    adminCount: number;
    isRegistrationClosed: boolean;
    hasConfiguredAdmin: boolean;
    maskedEmail: string | null;
    maskedMobile: string | null;
  } | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(true);

  // Login form state
  const [emailOrMobile, setEmailOrMobile] = useState('');
  const [password, setPassword] = useState('');

  // One-Time Setup (Registration) form state
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Password Recovery state
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryChannel, setRecoveryChannel] = useState<'EMAIL' | 'SMS'>('EMAIL');
  const [recoveryCode, setRecoveryCode] = useState('123456');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [maskedDestination, setMaskedDestination] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Status feedback
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch admin gateway status on mount
  useEffect(() => {
    let mounted = true;
    api
      .getAdminStatus()
      .then((status) => {
        if (!mounted) return;
        setAdminStatus(status);
        setIsStatusLoading(false);
        // If no admin is configured, automatically open the One-Time Setup view
        if (!status.hasConfiguredAdmin || status.adminCount === 0) {
          setView('REGISTER');
        } else {
          setView('LOGIN');
        }
      })
      .catch((err) => {
        console.warn('Failed to load admin gateway status:', err);
        if (mounted) setIsStatusLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Cooldown timer for recovery resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Standard Admin Login handler (Direct authentication without OTP)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      await adminLogin({
        emailOrMobile: emailOrMobile.trim(),
        password,
      });
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Administrative authentication failed. Access denied.');
    } finally {
      setIsLoading(false);
    }
  };

  // One-Time Setup (Registration) submit handler (Direct initialization without OTP)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!fullName.trim() || !regEmail.trim() || !regMobile.trim() || !regPassword) {
      setError('All administrative onboarding fields are mandatory.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Password and Confirm Password do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await adminRegister({
        fullName: fullName.trim(),
        email: regEmail.trim(),
        mobile: regMobile.trim(),
        password: regPassword,
        confirmPassword: regConfirmPassword,
        isEmailVerified: true,
        isPhoneVerified: true,
        isMobileVerified: true,
        termsAccepted: true,
        privacyAccepted: true,
      });

      // Update local state to permanently close registration
      setAdminStatus({
        adminCount: 1,
        isRegistrationClosed: true,
        hasConfiguredAdmin: true,
        maskedEmail: regEmail.trim(),
        maskedMobile: regMobile.trim(),
      });

      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'One-time administrative setup failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Request Password Recovery
  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const response = await api.requestAdminPasswordReset({
        identifier: recoveryIdentifier,
        channel: recoveryChannel,
      });

      setMaskedDestination(response.maskedTarget || null);
      setSuccessMessage(
        response.message || 'Recovery request accepted. Please set your new password.'
      );
      setResendCooldown(60);
      setView('FORGOT_VERIFY');
    } catch (err: any) {
      setError(
        err.message ||
          'Password recovery request failed. Access restricted to authorized Super Admin.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify & Reset Admin Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.verifyAdminPasswordReset({
        identifier: recoveryIdentifier,
        channel: recoveryChannel,
        code: recoveryCode || '123456',
        newPassword,
        confirmPassword,
      });

      setSuccessMessage(
        response.message ||
          'Master Admin password updated successfully. Please authenticate with your new credentials.'
      );
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setView('LOGIN');
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please check password strength policy.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend recovery code
  const handleResendRecovery = async () => {
    if (resendCooldown > 0 || !recoveryIdentifier) return;
    setError(null);
    setIsLoading(true);
    try {
      const response = await api.requestAdminPasswordReset({
        identifier: recoveryIdentifier,
        channel: recoveryChannel,
      });
      setSuccessMessage(
        response.message || 'Recovery reset instruction refreshed.'
      );
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend recovery reset.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isStatusLoading) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
        <div className="text-slate-400 font-mono text-xs flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
          <span>Verifying Master Admin security gateway status...</span>
        </div>
      </div>
    );
  }

  const isRegistrationClosed = Boolean(adminStatus?.hasConfiguredAdmin || (adminStatus && adminStatus.adminCount >= 1));

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full bg-slate-900 border border-rose-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden backdrop-blur-md">
        {/* Header Badge & Title */}
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-[11px] font-mono font-bold text-rose-400">
            <Shield className="w-3.5 h-3.5" />
            {view === 'REGISTER'
              ? 'One-Time Initial Setup • Master Admin'
              : 'Restricted Master Admin Gateway'}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {view === 'REGISTER'
              ? 'Master Admin Setup'
              : view === 'LOGIN'
              ? 'System Administrator'
              : 'Access Recovery'}
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            {view === 'REGISTER'
              ? 'First-time direct setup for the platform Super Admin. Once configured, registration is permanently locked.'
              : view === 'LOGIN'
              ? 'Direct authentication gateway with administrative credentials.'
              : 'Secure recovery protocol for pre-registered authorized Super Admin.'}
          </p>
        </div>

        {/* Security & Single-Admin Limit Banner */}
        <div className="mb-6 p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="font-mono text-[11px] text-slate-300">
              Single-Admin Limit: <strong>1 Account Max</strong>
            </span>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
              isRegistrationClosed
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}
          >
            {isRegistrationClosed ? 'Registration Locked (1/1)' : 'Initial Setup Open (0/1)'}
          </span>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="leading-relaxed">{error}</div>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <div className="leading-relaxed">{successMessage}</div>
          </div>
        )}

        {/* VIEW 0: ONE-TIME ADMIN SETUP (FIRST-TIME REGISTRATION ONLY) */}
        {view === 'REGISTER' && !isRegistrationClosed && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Admin Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full Legal Name"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 transition"
              />
            </div>

            {/* Authorized Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Authorized Email <span className="text-rose-400">*</span>
              </label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="admin@domain.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 transition font-mono"
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
                value={regMobile}
                onChange={(e) => setRegMobile(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 transition font-mono"
              />
            </div>

            {/* Strong Password */}
            <PasswordInput
              label="Administrative Strong Password"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              isAdmin={true}
              showPolicyChecks={true}
              placeholder="Min 10 chars, uppercase, digit, symbol"
            />

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Confirm Administrative Password <span className="text-rose-400">*</span>
              </label>
              <input
                type="password"
                required
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 transition font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-sm transition shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Provisioning Super Admin Account...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Initialize Single Super Admin Account</span>
                </>
              )}
            </button>

            <div className="pt-4 border-t border-slate-800/80 text-center">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-slate-500 hover:text-slate-400 transition text-[11px] cursor-pointer"
              >
                Return to Home
              </button>
            </div>
          </form>
        )}

        {/* VIEW 1: MASTER ADMIN LOGIN (POST-REGISTRATION EXCLUSIVE SCREEN) */}
        {view === 'LOGIN' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Admin Email or Mobile Number <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={emailOrMobile}
                onChange={(e) => setEmailOrMobile(e.target.value)}
                placeholder="Enter authorized email or mobile"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 transition font-mono"
              />
            </div>

            <PasswordInput
              label="Administrative Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              isAdmin={true}
              showPolicyChecks={false}
              placeholder="Enter your administrative password"
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-sm transition shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Administrative Credentials...</span>
                </>
              ) : (
                <>
                  <span>Authenticate & Enter Gateway</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Password Recovery Navigation */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccessMessage(null);
                  setRecoveryIdentifier(emailOrMobile);
                  setView('FORGOT_REQUEST');
                }}
                className="text-rose-400 hover:text-rose-300 transition text-[11px] font-medium flex items-center gap-1 cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Forgot Administrative Password?
              </button>

              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-slate-500 hover:text-slate-400 transition text-[11px] cursor-pointer"
              >
                Return to Home
              </button>
            </div>
          </form>
        )}

        {/* VIEW 2: Password Recovery - Step 1 */}
        {view === 'FORGOT_REQUEST' && (
          <form onSubmit={handleRequestRecovery} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Authorized Admin Identifier <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={recoveryIdentifier}
                onChange={(e) => setRecoveryIdentifier(e.target.value)}
                placeholder="Pre-registered email or mobile"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 transition font-mono"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Must match the authorized Super Admin account on record.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Recovery Delivery Channel <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRecoveryChannel('EMAIL')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer text-xs ${
                    recoveryChannel === 'EMAIL'
                      ? 'bg-rose-500/10 border-rose-500/50 text-rose-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Mail className="w-4 h-4 text-indigo-400" />
                  <span>Authorized Email</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRecoveryChannel('SMS')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer text-xs ${
                    recoveryChannel === 'SMS'
                      ? 'bg-rose-500/10 border-rose-500/50 text-rose-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Mobile Phone</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !recoveryIdentifier.trim()}
              className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-sm transition shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {isLoading ? 'Processing Request...' : 'Proceed to Password Reset'}
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-4 border-t border-slate-800/80 text-center">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setView('LOGIN');
                }}
                className="text-slate-400 hover:text-white transition text-xs flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Administrator Sign In
              </button>
            </div>
          </form>
        )}

        {/* VIEW 3: Password Recovery - Step 2 (Set New Password) */}
        {view === 'FORGOT_VERIFY' && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            {maskedDestination && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 space-y-0.5">
                <span className="text-[10px] uppercase font-mono text-slate-500">
                  Target Account
                </span>
                <div className="font-mono text-slate-200 font-semibold">
                  {maskedDestination}
                </div>
              </div>
            )}

            <PasswordInput
              label="New Administrative Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              isAdmin={true}
              showPolicyChecks={true}
              placeholder="Min 10 chars, uppercase, digit, symbol"
            />

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Confirm New Password <span className="text-rose-400">*</span>
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new administrative password"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 transition font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !newPassword}
              className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-sm transition shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {isLoading ? 'Updating Password...' : 'Update Administrative Password'}
              <CheckCircle2 className="w-4 h-4" />
            </button>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-center text-xs">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setView('LOGIN');
                }}
                className="text-slate-400 hover:text-white transition text-xs flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Cancel & Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
