import React, { useState, useEffect } from 'react';
import { Mail, Phone, ShieldCheck, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../services/api.ts';

interface OtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: 'EMAIL' | 'SMS';
  target: string;
  onVerified: (code: string) => void;
}

export const OtpModal: React.FC<OtpModalProps> = ({
  isOpen,
  onClose,
  channel,
  target,
  onVerified,
}) => {
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && target) {
      handleSendOtp();
    }
  }, [isOpen, target]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  if (!isOpen) return null;

  const handleSendOtp = async () => {
    if (!target) return;
    setIsSending(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await api.sendOtp(target, channel);
      setCooldown(res.cooldownSeconds || 60);
      setSuccessMessage(res.message);
      if (res.devVerificationCode) {
        setDevCode(res.devVerificationCode);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP.');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.trim().length !== 6) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const res = await api.verifyOtp(target, channel, code.trim());
      if (res.success) {
        onVerified(code.trim());
        onClose();
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-2xl p-6 shadow-2xl relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            {channel === 'EMAIL' ? <Mail className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              Verify {channel === 'EMAIL' ? 'Email Address' : 'Mobile Number'}
            </h3>
            <p className="text-xs text-slate-400 font-mono">{target}</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          TaskHub enforces actual two-channel verification. We have dispatched a 6-digit cryptographic verification code to your {channel === 'EMAIL' ? 'inbox' : 'SMS messaging app'}. Code is valid for 10 minutes.
        </p>

        {devCode && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200">
              <span className="font-semibold">Development Mode Code: </span>
              <span className="font-mono font-bold bg-amber-500/20 px-2 py-0.5 rounded text-amber-100 ml-1">
                {devCode}
              </span>
              <button
                type="button"
                onClick={() => setCode(devCode)}
                className="ml-2 underline text-amber-300 hover:text-white"
              >
                Auto-fill
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && !error && (
          <div className="mb-4 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Enter 6-Digit OTP Code
            </label>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              autoFocus
              className="w-full text-center tracking-[0.5em] font-mono text-2xl font-bold bg-slate-950 border border-slate-700 rounded-xl py-3 text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-400">Didn't receive code?</span>
            {cooldown > 0 ? (
              <span className="text-slate-500 font-mono">Resend in {cooldown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSending}
                className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold transition"
              >
                <RefreshCw className={`w-3 h-3 ${isSending ? 'animate-spin' : ''}`} />
                Resend OTP
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying || code.length !== 6}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              {isVerifying ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Verify Code
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
