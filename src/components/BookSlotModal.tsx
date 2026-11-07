import React, { useState } from 'react';
import {
  Users,
  User,
  ShieldCheck,
  CheckCircle,
  Copy,
  Check,
  AlertCircle,
  X,
  ArrowRight,
  Sparkles,
  Link2,
  DollarSign,
  MapPin,
  Calendar,
  Clock,
  Landmark,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Gig } from '../types.ts';

interface BookSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  gig: Gig;
  onSuccess: () => void;
}

export const BookSlotModal: React.FC<BookSlotModalProps> = ({
  isOpen,
  onClose,
  gig,
  onSuccess,
}) => {
  const [bookingType, setBookingType] = useState<'INDIVIDUAL' | 'REFERRAL_GANG'>('INDIVIDUAL');
  const [gangName, setGangName] = useState('');
  const [gangCount, setGangCount] = useState<number>(2);
  const [friends, setFriends] = useState<Array<{ name: string; mobile: string }>>([
    { name: '', mobile: '' },
  ]);

  // Designated consolidated payout account for gangs
  const [payoutMethod, setPayoutMethod] = useState<'UPI' | 'BANK'>('UPI');
  const [designatedUpi, setDesignatedUpi] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const availableSlots = Math.max(0, gig.requiredWorkers - (gig.confirmedWorkers || 0));
  const maxGangMembers = Math.min(5, availableSlots);

  const handleGangCountChange = (count: number) => {
    setGangCount(count);
    const newFriends = [];
    // 1 friend less than gangCount since the partner himself is 1
    const needed = Math.max(1, count - 1);
    for (let i = 0; i < needed; i++) {
      newFriends.push(friends[i] || { name: '', mobile: '' });
    }
    setFriends(newFriends);
  };

  const handleFriendChange = (index: number, field: 'name' | 'mobile', value: string) => {
    const updated = [...friends];
    updated[index] = { ...updated[index], [field]: value };
    setFriends(updated);
  };

  const referralUrl = `${window.location.origin}/partner/browse?gigId=${gig.id}&refGang=${encodeURIComponent(gangName || 'GangInvite')}`;

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const slotsToBook = bookingType === 'REFERRAL_GANG' ? gangCount : 1;
    if (slotsToBook > availableSlots) {
      setError(`Cannot book ${slotsToBook} slots. Only ${availableSlots} open slot(s) remain.`);
      return;
    }

    if (bookingType === 'REFERRAL_GANG') {
      if (!gangName.trim()) {
        setError('Please provide a name for your Referral Gang.');
        return;
      }
      if (payoutMethod === 'UPI' && !designatedUpi.trim()) {
        setError('Please enter the designated UPI ID for the consolidated gang payout.');
        return;
      }
      if (payoutMethod === 'BANK' && (!bankAccount.trim() || !bankIfsc.trim())) {
        setError('Please enter complete bank account number and IFSC code.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await api.bookGigSlot(gig.id, {
        bookingType,
        gangName: bookingType === 'REFERRAL_GANG' ? gangName.trim() : undefined,
        gangCount: slotsToBook,
        gangMembers: bookingType === 'REFERRAL_GANG' ? friends.filter((f) => f.name.trim()) : [],
        designatedPayoutAccount:
          bookingType === 'REFERRAL_GANG'
            ? {
                upiId: payoutMethod === 'UPI' ? designatedUpi.trim() : undefined,
                bankAccount: payoutMethod === 'BANK' ? bankAccount.trim() : undefined,
                ifsc: payoutMethod === 'BANK' ? bankIfsc.trim().toUpperCase() : undefined,
                accountHolder: accountHolder.trim() || undefined,
              }
            : undefined,
        notes: notes.trim(),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to book slot.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatedTotalEarnings = (gig.paymentAmount || 0) * (bookingType === 'REFERRAL_GANG' ? gangCount : 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 max-w-lg w-full rounded-3xl shadow-2xl overflow-hidden relative my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-slate-900 px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Book Gig Slot Now</h3>
              <p className="text-xs text-slate-400">Pre-funded escrow guarantee by host</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Gig mini summary */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-400 uppercase">
                  {gig.category}
                </span>
                <h4 className="text-sm font-bold text-white line-clamp-1">{gig.title}</h4>
                <div className="text-slate-400 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">{gig.workLocation}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-sm font-black text-emerald-400 font-mono">
                  ₹{gig.paymentAmount}
                </div>
                <div className="text-[10px] text-slate-500">{gig.paymentBasis}</div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" /> {gig.workDate}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" /> {gig.shiftStartTime} - {gig.shiftEndTime}
              </span>
              <span className="font-mono font-bold text-blue-300">
                {availableSlots} Slot{availableSlots !== 1 ? 's' : ''} Open
              </span>
            </div>
          </div>

          {/* Booking Type Selector: Individual vs Referral Gang */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Choose Booking Mode
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBookingType('INDIVIDUAL')}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                  bookingType === 'INDIVIDUAL'
                    ? 'border-blue-500 bg-blue-500/10 text-white shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/30'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-white">Individual Slot</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Reserve 1 slot for yourself. Personal wallet payout upon completion.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setBookingType('REFERRAL_GANG')}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                  bookingType === 'REFERRAL_GANG'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white">Referral Gang (Group)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Book together with friends. Unified check-in log and consolidated payout!
                </p>
              </button>
            </div>
          </div>

          {/* Referral Gang Specific Fields */}
          {bookingType === 'REFERRAL_GANG' && (
            <div className="p-4 bg-slate-950 border border-indigo-500/30 rounded-2xl space-y-4 animate-fade-in text-xs">
              <div className="flex items-center justify-between">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Gang Configuration</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
                  Max {maxGangMembers} Slots
                </span>
              </div>

              {/* Gang Name */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Gang / Crew Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={gangName}
                  onChange={(e) => setGangName(e.target.value)}
                  placeholder="e.g. Metro Shift Gang, Event Masters"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Gang Count Selector */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Total Workers in Gang (You + Friends): <strong>{gangCount} Workers</strong>
                </label>
                <div className="flex items-center gap-2">
                  {[2, 3, 4, 5]
                    .filter((n) => n <= maxGangMembers)
                    .map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleGangCountChange(num)}
                        className={`flex-1 py-1.5 rounded-xl border font-bold font-mono transition cursor-pointer ${
                          gangCount === num
                            ? 'border-indigo-500 bg-indigo-600 text-white'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                </div>
              </div>

              {/* Friends Details */}
              <div className="space-y-2">
                <label className="text-[11px] text-slate-400 block">
                  Friend / Team Member Info ({friends.length} friend{friends.length > 1 ? 's' : ''}):
                </label>
                {friends.map((friend, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder={`Friend #${idx + 1} Full Name`}
                      value={friend.name}
                      onChange={(e) => handleFriendChange(idx, 'name', e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="Mobile / WhatsApp"
                      value={friend.mobile}
                      onChange={(e) => handleFriendChange(idx, 'mobile', e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                ))}
              </div>

              {/* Designated Bank / UPI Account for Consolidated Payout */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-300">
                    Designated Consolidated Payout Account <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setPayoutMethod('UPI')}
                      className={`px-2 py-0.5 rounded-lg border font-semibold ${
                        payoutMethod === 'UPI'
                          ? 'border-indigo-500 bg-indigo-500/20 text-white'
                          : 'border-slate-800 text-slate-400'
                      }`}
                    >
                      UPI ID
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayoutMethod('BANK')}
                      className={`px-2 py-0.5 rounded-lg border font-semibold ${
                        payoutMethod === 'BANK'
                          ? 'border-indigo-500 bg-indigo-500/20 text-white'
                          : 'border-slate-800 text-slate-400'
                      }`}
                    >
                      Bank Account
                    </button>
                  </div>
                </div>

                {payoutMethod === 'UPI' ? (
                  <div>
                    <input
                      type="text"
                      value={designatedUpi}
                      onChange={(e) => setDesignatedUpi(e.target.value)}
                      placeholder="e.g. gangleader@okaxis or 9876543210@upi"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Single consolidated payout for all {gangCount} workers will be dispatched to this UPI ID.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        placeholder="Bank Account Number"
                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                      />
                      <input
                        type="text"
                        value={bankIfsc}
                        onChange={(e) => setBankIfsc(e.target.value)}
                        placeholder="IFSC Code (e.g. HDFC0001234)"
                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono uppercase"
                      />
                    </div>
                    <input
                      type="text"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      placeholder="Account Beneficiary Name"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                )}
              </div>

              {/* Shareable Link Box */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 truncate">
                  Referral Link: <span className="font-mono text-slate-300">{referralUrl}</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyReferral}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold flex items-center gap-1 shrink-0"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedLink ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          )}

          {/* Optional Notes */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">
              Work Notes / Availability Note (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Reaching by 8:45 AM, experienced in catering packing"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
            />
          </div>

          {/* Escrow Release & Earnings Breakdown */}
          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-[11px] text-slate-400 block">Total Expected Payout</span>
              <span className="text-base font-black text-emerald-400 font-mono">
                ₹{calculatedTotalEarnings.toLocaleString()}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Escrow Pre-Funded
              </span>
              <span className="text-[10px] text-slate-500">100% Release upon Host Approval</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-1/3 py-3 rounded-2xl border border-slate-800 hover:bg-slate-800 text-xs font-bold text-slate-300 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Locking Slot...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    Confirm {bookingType === 'REFERRAL_GANG' ? `Gang Booking (${gangCount} Slots)` : 'Slot Booking'}
                  </span>
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
