import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext.tsx';
import { registerServiceWorker, sendCrossDeviceNotification } from '../utils/webPush.ts';

interface RealtimeContextType {
  isConnected: boolean;
  lastEvent: { type: string; payload: any; timestamp: number } | null;
  toast: { title: string; message: string; type: 'info' | 'success' | 'alert' } | null;
  clearToast: () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<{ type: string; payload: any; timestamp: number } | null>(null);
  const [toast, setToast] = useState<{ title: string; message: string; type: 'info' | 'success' | 'alert' } | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Register Service Worker for Web Push
    registerServiceWorker();

    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/events');

        eventSource.onopen = () => {
          setIsConnected(true);
        };

        eventSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'CONNECTED') {
              setIsConnected(true);
              return;
            }

            setLastEvent({ type: data.type, payload: data.payload, timestamp: Date.now() });

            // 1. Direct user-targeted notification
            if (data.type === 'NOTIFICATION_SENT' && user && data.payload.userId === user.id) {
              setToast({
                title: data.payload.title,
                message: data.payload.message,
                type: data.payload.type === 'ALERT' ? 'alert' : data.payload.type === 'SUCCESS' ? 'success' : 'info',
              });

              // Dispatch Out-of-App Device Push Alert with sound chime
              sendCrossDeviceNotification(data.payload.title, {
                body: data.payload.message,
                link: data.payload.link || '/',
                playSound: true,
              });
            }

            // 2. Announcements broadcast
            else if (data.type === 'ANNOUNCEMENT_POSTED') {
              const ann = data.payload;
              if (
                ann.targetAudience === 'ALL' ||
                !user ||
                ann.targetAudience === user.role
              ) {
                setToast({
                  title: `Announcement: ${ann.title}`,
                  message: ann.body,
                  type: ann.priority === 'URGENT' ? 'alert' : 'info',
                });

                sendCrossDeviceNotification(`📢 TaskHub: ${ann.title}`, {
                  body: ann.body,
                  link: ann.actionUrl || '/',
                  playSound: true,
                });
              }
            }

            // 3. Trigger for GIG PARTNER: New micro-gig created within radius
            else if (data.type === 'GIG_CREATED' && user && user.role === 'GIG_PARTNER') {
              const gig = data.payload;
              const title = `🔔 New Micro-Gig Available: ${gig.title}`;
              const message = `₹${gig.paymentAmount} / ${gig.paymentBasis} in ${gig.workLocation}. Tap to view and reserve your slot!`;

              setToast({ title, message, type: 'info' });
              sendCrossDeviceNotification(title, {
                body: message,
                link: `/partner/browse?gigId=${gig.id}`,
                playSound: true,
              });
            }

            // 3b. Trigger for GIG HOST: A Gig Partner accepted or booked a task
            else if (data.type === 'GIG_ACCEPTED' && user && user.role === 'GIG_HOST') {
              const info = data.payload;
              if (!info.hostId || info.hostId === user.id) {
                const title = `⚡ A Gig Partner Accepted Your Task!`;
                const message = `${info.partnerName || 'A Gig Partner'} has accepted your task "${info.gigTitle || 'your gig'}". Tap to review details and attendance.`;

                setToast({ title, message, type: 'success' });
                sendCrossDeviceNotification(title, {
                  body: message,
                  link: `/host/gigs/${info.gigId || ''}`,
                  playSound: true,
                });
              }
            }

            // 4. Trigger for SERVICE SEEKER: Booking status update or technician arrival
            else if (data.type === 'BOOKING_UPDATED' && user && user.role === 'SERVICE_SEEKER') {
              const booking = data.payload;
              if (booking.seekerId === user.id) {
                const title = `🛠️ Booking Status: ${booking.serviceTitle}`;
                const message = `Your service booking is now ${booking.status.replace(/_/g, ' ')}. ${
                  booking.customerApproved ? 'Payment settled successfully.' : 'Tap to manage.'
                }`;

                setToast({ title, message, type: 'success' });
                sendCrossDeviceNotification(title, {
                  body: message,
                  link: '/seeker/bookings',
                  playSound: true,
                });
              }
            }

            // 5. Trigger for TECH PARTNER: New customer booking created & baseline escrow locked
            else if (data.type === 'BOOKING_CREATED' && user && user.role === 'TECH_PARTNER') {
              const booking = data.payload;
              if (booking.techPartnerId === user.id) {
                const title = `📅 New Service Booking Confirmed!`;
                const message = `${booking.seekerName} booked "${booking.serviceTitle}" for ${booking.serviceDate}. Baseline escrow is secured.`;

                setToast({ title, message, type: 'success' });
                sendCrossDeviceNotification(title, {
                  body: message,
                  link: '/tech/bookings',
                  playSound: true,
                });
              }
            }

            // 6. Trigger for GIG HOST: Applicant submitted or attendance check-out submitted
            else if (data.type === 'ATTENDANCE_UPDATED' && user && user.role === 'GIG_HOST') {
              const att = data.payload;
              if (att.checkOutTime && !att.hostApproved) {
                const title = `⏱️ Shift Completion Approval Required`;
                const message = `${att.partnerName} has checked out. Please review work and authorize payment release.`;

                setToast({ title, message, type: 'alert' });
                sendCrossDeviceNotification(title, {
                  body: message,
                  link: '/host/approvals',
                  playSound: true,
                });
              }
            }

            // 7. Trigger for WALLET CREDITS (Gig Partner & Tech Partner)
            else if (data.type === 'WALLET_UPDATED' && user && data.payload.userId === user.id) {
              const wallet = data.payload.wallet;
              const title = `💰 Wallet Payment Credited!`;
              const message = `Available Withdrawable Balance is now ₹${wallet.availableWithdrawableBalance.toFixed(2)}.`;

              setToast({ title, message, type: 'success' });
              sendCrossDeviceNotification(title, {
                body: message,
                link: user.role === 'TECH_PARTNER' ? '/tech/wallet' : '/partner/earnings',
                playSound: true,
              });
            }
          } catch (err) {
            // ignore heartbeat/malformed
          }
        };

        eventSource.onerror = () => {
          setIsConnected(false);
          if (eventSource) {
            eventSource.close();
          }
          reconnectTimeout = setTimeout(connectSSE, 4000);
        };
      } catch (err) {
        console.warn('SSE connection failed, will retry:', err);
        reconnectTimeout = setTimeout(connectSSE, 5000);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [user?.id]);

  const clearToast = () => setToast(null);

  return (
    <RealtimeContext.Provider value={{ isConnected, lastEvent, toast, clearToast }}>
      {children}
      {/* Toast Notification Popup */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl shadow-black/80 flex items-start gap-3 animate-slide-up">
          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${toast.type === 'success' ? 'bg-emerald-400 ring-4 ring-emerald-500/20' : toast.type === 'alert' ? 'bg-rose-400 ring-4 ring-rose-500/20' : 'bg-indigo-400 ring-4 ring-indigo-500/20'}`} />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-white">{toast.title}</h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{toast.message}</p>
          </div>
          <button
            onClick={clearToast}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>
      )}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = (): RealtimeContextType => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};
