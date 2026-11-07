import React, { useState, useEffect } from 'react';
import { Bell, BellRing, CheckCircle, X, ShieldAlert, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { getWebPushPermission, requestWebPushPermission, sendCrossDeviceNotification } from '../utils/webPush.ts';

export const WebPushPrompt: React.FC = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<string>('default');
  const [isDismissed, setIsDismissed] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [activatedSuccess, setActivatedSuccess] = useState(false);

  useEffect(() => {
    setPermission(getWebPushPermission());
    const dismissed = sessionStorage.getItem('taskhub_push_prompt_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, [user?.id]);

  if (!user || isDismissed || permission === 'granted' || permission === 'denied' || permission === 'unsupported') {
    return null;
  }

  const handleEnable = async () => {
    setIsActivating(true);
    const newPerm = await requestWebPushPermission();
    setPermission(newPerm);
    setIsActivating(false);

    if (newPerm === 'granted') {
      setActivatedSuccess(true);
      sendCrossDeviceNotification('🔔 TaskHub Device Alerts Enabled!', {
        body: `Welcome, ${user.fullName}! You will now receive real-time out-of-app alerts for bookings, nearby gigs, and escrow payments.`,
        link: '/',
        playSound: true,
      });

      setTimeout(() => {
        setIsDismissed(true);
        sessionStorage.setItem('taskhub_push_prompt_dismissed', 'true');
      }, 3000);
    } else {
      setIsDismissed(true);
      sessionStorage.setItem('taskhub_push_prompt_dismissed', 'true');
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('taskhub_push_prompt_dismissed', 'true');
  };

  return (
    <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-md w-full bg-slate-900 border border-indigo-500/40 rounded-2xl p-4 shadow-2xl shadow-indigo-950/80 animate-fade-in text-white space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
            <BellRing className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <h4 className="text-sm font-bold tracking-tight">Enable Out-of-App Device Alerts</h4>
            <p className="text-[11px] text-slate-400">
              Receive real-time alerts even when you are not actively viewing this page.
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="text-[11px] text-slate-300 bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 space-y-1">
        <div className="font-semibold text-indigo-300">Automated triggers tailored to your role:</div>
        <ul className="list-disc list-inside space-y-0.5 text-slate-400">
          {user.role === 'GIG_PARTNER' && <li>New micro-gigs posted within your 10 km radius</li>}
          {user.role === 'SERVICE_SEEKER' && <li>Instant alerts when technician accepts or updates bookings</li>}
          {(user.role === 'GIG_HOST' || user.role === 'TECH_PARTNER') && (
            <li>Check-out approvals, shift extensions, and wallet payments</li>
          )}
        </ul>
      </div>

      {activatedSuccess ? (
        <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Device notifications enabled! A test notification was sent.</span>
        </div>
      ) : (
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleDismiss}
            className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400 text-xs font-semibold transition"
          >
            Not Now
          </button>
          <button
            type="button"
            onClick={handleEnable}
            disabled={isActivating}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isActivating ? 'Requesting...' : 'Enable Web Push Alerts'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
