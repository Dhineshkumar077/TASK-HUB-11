import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
  Users,
  MapPin,
  AlertCircle,
  CheckCircle,
  Lock,
  Layers,
  Sparkles,
  Shield,
  FileText,
} from 'lucide-react';
import type { Gig } from '../types.ts';
import { api } from '../services/api.ts';
import { validatePrivacyText } from '../utils/privacyFilter.ts';

const GIG_CATEGORIES = [
  'Retail and Store Associate',
  'Supermarket Cashier & Stacker',
  'Warehouse & Inventory Helper',
  'Event Staff & Hospitality',
  'Logistics and Parcel Sorter',
  'Food Packing and Production',
  'Customer Support and Greeter',
  'Cleaning & Sanitization Crew',
  'Promotional Ambassador',
  'Delivery Partner Helper',
  'Others',
];

interface EditGigModalProps {
  isOpen: boolean;
  gig: Gig | null;
  onClose: () => void;
  onGigUpdated: (updatedGig: Gig) => void;
}

export const EditGigModal: React.FC<EditGigModalProps> = ({
  isOpen,
  gig,
  onClose,
  onGigUpdated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [employmentType, setEmploymentType] = useState('Temporary Shift');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [requiredExperience, setRequiredExperience] = useState('');
  const [workDate, setWorkDate] = useState('');
  const [shiftStartTime, setShiftStartTime] = useState('');
  const [shiftEndTime, setShiftEndTime] = useState('');
  const [customDuration, setCustomDuration] = useState('');
  const [requiredWorkers, setRequiredWorkers] = useState<number>(1);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentBasis, setPaymentBasis] = useState<string>('Per Shift');
  const [workLocation, setWorkLocation] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('PUBLISHED');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Check if locked
  const isLocked = Boolean(
    gig?.isLocked ||
      gig?.status === 'IN_PROGRESS' ||
      gig?.status === 'COMPLETED' ||
      (gig?.confirmedWorkers || 0) > 0
  );

  useEffect(() => {
    if (gig && isOpen) {
      setTitle(gig.title || '');
      setDescription(gig.description || '');
      setCategory(gig.category || GIG_CATEGORIES[0]);
      setCustomCategory(gig.customCategory || '');
      setEmploymentType(gig.employmentType || 'Temporary Shift');
      setRequiredSkills(gig.requiredSkills || '');
      setRequiredExperience(gig.requiredExperience || '');
      setWorkDate(gig.workDate || '');
      setShiftStartTime(gig.shiftStartTime || '');
      setShiftEndTime(gig.shiftEndTime || '');
      setCustomDuration(gig.customDuration || '4 Hours');
      setRequiredWorkers(gig.requiredWorkers || 1);
      setPaymentAmount(gig.paymentAmount ? String(gig.paymentAmount) : '');
      setPaymentBasis(gig.paymentBasis || 'Per Shift');
      setWorkLocation(gig.workLocation || '');
      setFullAddress(gig.fullAddress || '');
      setLatitude(gig.latitude);
      setLongitude(gig.longitude);
      setAdditionalInstructions(gig.additionalInstructions || '');
      setStatus((gig.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED') as any);

      setError(null);
      setSuccessMsg(null);
    }
  }, [gig, isOpen]);

  if (!isOpen || !gig) return null;

  // Real-time Escrow Calculation Preview
  const numWorkers = Math.max(1, requiredWorkers || 1);
  const basePay = parseFloat(paymentAmount) || 0;
  const grossWorkerPool = Math.round(basePay * numWorkers * 100) / 100;
  const platformFee = Math.round(grossWorkerPool * 0.05 * 100) / 100;
  const taxes = Math.round(platformFee * 0.18 * 100) / 100;
  const totalEscrow = Math.round((grossWorkerPool + platformFee + taxes) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (isLocked) {
      setError(
        'Editing Locked: This gig is currently in-progress or has active confirmed workers. Rate changes and core headcount modifications are prohibited to protect confirmed workers and escrow reserves.'
      );
      return;
    }

    if (!title.trim()) {
      setError('Please provide a gig title.');
      return;
    }
    if (!category) {
      setError('Please select a valid gig category.');
      return;
    }
    if (category === 'Others' && !customCategory.trim()) {
      setError('Please specify the custom category name.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a task description.');
      return;
    }
    if (!workDate) {
      setError('Please specify the scheduled work date.');
      return;
    }
    if (!shiftStartTime || !shiftEndTime) {
      setError('Please provide shift start and end times.');
      return;
    }
    if (numWorkers <= 0) {
      setError('Required worker count must be at least 1.');
      return;
    }
    if (basePay <= 0) {
      setError('Please enter a valid positive base payout amount.');
      return;
    }
    if (!workLocation.trim()) {
      setError('Please specify the work location / area.');
      return;
    }
    if (!fullAddress.trim()) {
      setError('Please provide the full street address for on-site geofencing.');
      return;
    }

    // Privacy checks
    const checkDesc = validatePrivacyText(description);
    if (checkDesc.hasViolation) {
      setError(`Privacy Violation in Description: ${checkDesc.reason}`);
      return;
    }
    const checkLoc = validatePrivacyText(workLocation);
    if (checkLoc.hasViolation) {
      setError(`Privacy Violation in Location: ${checkLoc.reason}`);
      return;
    }
    const checkAddr = validatePrivacyText(fullAddress);
    if (checkAddr.hasViolation) {
      setError(`Privacy Violation in Address: ${checkAddr.reason}`);
      return;
    }
    if (additionalInstructions) {
      const checkInst = validatePrivacyText(additionalInstructions);
      if (checkInst.hasViolation) {
        setError(`Privacy Violation in Instructions: ${checkInst.reason}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        customCategory: category === 'Others' ? customCategory.trim() : undefined,
        employmentType,
        requiredSkills: requiredSkills.trim(),
        requiredExperience: requiredExperience.trim(),
        workDate,
        shiftStartTime,
        shiftEndTime,
        customDuration: customDuration.trim() || 'Flexible',
        requiredWorkers: numWorkers,
        paymentAmount: basePay,
        paymentBasis,
        workLocation: workLocation.trim(),
        fullAddress: fullAddress.trim(),
        latitude,
        longitude,
        additionalInstructions: additionalInstructions.trim() || undefined,
        status,
      };

      const res = await api.updateGig(gig.id, payload);
      setSuccessMsg('Gig listing modified and updated in database successfully!');
      if (res.gig) {
        onGigUpdated(res.gig);
      }
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to update gig listing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                Edit Micro-Gig Listing
                {isLocked && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Locked — Active Escrow
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Update shift timing, headcount, descriptions, and payout terms.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Lock Banner */}
        {isLocked && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-3">
            <Lock className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-rose-200">
                Rate & Listing Modification Locked
              </div>
              <p className="text-[11px] text-rose-300/80 leading-relaxed">
                This gig currently has <strong>{gig.confirmedWorkers || 0} confirmed worker(s)</strong> or is actively in progress with pre-funded platform escrow. To protect workers against post-booking rate manipulation, core terms cannot be altered. To make modifications, cancel any unfulfilled slots or post a new gig.
              </p>
            </div>
          </div>
        )}

        {/* Error and Success Notifications */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Task Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              1. Task Overview & Description
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Gig Title *
                </label>
                <input
                  type="text"
                  required
                  disabled={isLocked}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Evening Supermarket Inventory Sorter"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Category *
                </label>
                <select
                  disabled={isLocked}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  {GIG_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {category === 'Others' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Custom Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isLocked}
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Specify custom work category"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Employment Type
                </label>
                <select
                  disabled={isLocked}
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  <option value="Temporary Shift">Temporary Shift (1 Day)</option>
                  <option value="Multi-Day Gig">Multi-Day Gig (2–5 Days)</option>
                  <option value="Weekend Blitz">Weekend Blitz</option>
                  <option value="Event Staffing">Event Staffing</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Task Description & Requirements *
                </label>
                <textarea
                  rows={3}
                  required
                  disabled={isLocked}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail the duties, dress code, report-in procedures, and physical demands..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Shift Timing & Schedule */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              2. Shift Timing & Schedule
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Scheduled Work Date *
                </label>
                <input
                  type="date"
                  required
                  disabled={isLocked}
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Shift Start Time *
                </label>
                <input
                  type="time"
                  required
                  disabled={isLocked}
                  value={shiftStartTime}
                  onChange={(e) => setShiftStartTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Shift End Time *
                </label>
                <input
                  type="time"
                  required
                  disabled={isLocked}
                  value={shiftEndTime}
                  onChange={(e) => setShiftEndTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Shift Duration Label
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  placeholder="e.g. 4 Hours / Half-Day"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Headcount & Payout Rates */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              3. Worker Headcount & Base Payout Structure
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Required Worker Headcount *
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    disabled={isLocked}
                    value={requiredWorkers}
                    onChange={(e) => setRequiredWorkers(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {gig.confirmedWorkers || 0} slots currently filled
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Base Payout (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-500">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    disabled={isLocked}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Compensation paid to each worker
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Payout Basis
                </label>
                <select
                  disabled={isLocked}
                  value={paymentBasis}
                  onChange={(e) => setPaymentBasis(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  <option value="Per Shift">Per Shift</option>
                  <option value="Per Hour">Per Hour</option>
                  <option value="Per Day">Per Day</option>
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Escrow locked upon posting
                </span>
              </div>
            </div>

            {/* Live Escrow Calculation Preview */}
            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span>Worker Pool Escrow ({numWorkers} × ₹{basePay}):</span>
                <span className="font-mono font-bold text-white">₹{grossWorkerPool.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>TaskHub Platform Fee (5%):</span>
                <span className="font-mono">₹{platformFee.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Applicable GST (18% on platform fee):</span>
                <span className="font-mono">₹{taxes.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-indigo-500/20 text-indigo-300 font-bold">
                <span>Total Escrow Commitment:</span>
                <span className="font-mono text-sm text-indigo-400">₹{totalEscrow.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Section 4: Location & Work Address */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              4. Work Location & On-Site Geofence
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Work Location / Hub Name *
                </label>
                <input
                  type="text"
                  required
                  disabled={isLocked}
                  value={workLocation}
                  onChange={(e) => setWorkLocation(e.target.value)}
                  placeholder="e.g. Metro Supermarket — South Hub"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Street Address (200m Geofence Anchor) *
                </label>
                <input
                  type="text"
                  required
                  disabled={isLocked}
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  placeholder="e.g. 144 Commercial Street, Bangalore"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Additional Work / Reporting Instructions (Optional)
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder="e.g. Report to Gate 3 at 5:45 PM. Wear closed shoes."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-800">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>Real-time database mutation with cloud SSE synchronization</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || isLocked}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Saving Changes...' : 'Save & Update Gig'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
