import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  ArrowRight,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  AlertCircle,
  Percent,
  CheckCircle,
  HelpCircle,
  Navigation,
  Lock,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { PlatformSettings } from '../../types.ts';
import { InteractiveMap } from '../../components/InteractiveMap.tsx';
import { EscrowPaymentModal } from '../../components/EscrowPaymentModal.tsx';
import { getCurrentDeviceLocation } from '../../utils/geolocation.ts';

interface PostGigProps {
  navigate: (path: string) => void;
}

const GIG_CATEGORIES = [
  'Catering',
  'Marriage and Event Staffing',
  'Supermarket',
  'Retail Store',
  'Warehouse',
  'Packing',
  'Loading and Unloading',
  'Food Industry',
  'Delivery Support',
  'Shop Assistance',
  'Promotional Work',
  'Office Assistance',
  'Temporary Contract Work',
  'Others',
];

export const PostGig: React.FC<PostGigProps> = ({ navigate }) => {
  // ZERO DUMMY DATA: All form fields start strictly BLANK as mandated
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [employmentType, setEmploymentType] = useState('Temporary Shift');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [requiredWorkers, setRequiredWorkers] = useState('');
  const [workDate, setWorkDate] = useState('');
  const [shiftStartTime, setShiftStartTime] = useState('');
  const [shiftEndTime, setShiftEndTime] = useState('');
  const [customDuration, setCustomDuration] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentBasis, setPaymentBasis] = useState('Per Shift');
  const [requiredExperience, setRequiredExperience] = useState('');
  const [workLocation, setWorkLocation] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [applicationDeadline, setApplicationDeadline] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');

  // FlexiStaff Contract integration
  const [isFlexiStaff, setIsFlexiStaff] = useState(false);
  const [flexiStaffDurationMonths, setFlexiStaffDurationMonths] = useState('');
  const [flexiStaffFeePercentage, setFlexiStaffFeePercentage] = useState('7.5');

  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEscrowModalOpen, setIsEscrowModalOpen] = useState(false);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);

  useEffect(() => {
    api.getCommissionSettings()
      .then((res) => {
        if (res?.settings) setPlatformSettings(res.settings);
      })
      .catch(() => {});
  }, []);

  const handleUseMyLocation = async () => {
    setIsLocating(true);
    setError(null);

    try {
      const loc = await getCurrentDeviceLocation();
      setLatitude(loc.latitude);
      setLongitude(loc.longitude);
      if (loc.formattedAddress) {
        setFullAddress(loc.formattedAddress);
        if (!workLocation) {
          setWorkLocation(loc.formattedAddress.split(',')[0]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'GPS acquisition failed. Please select location directly on the map.');
    } finally {
      setIsLocating(false);
    }
  };

  // Dynamic Commission Tiers:
  // 1 to 5 Members: Default 10% platform brokerage fee deducted from Gig Host's posted budget
  // Above 5 Members (Bulk): Default 5% platform brokerage fee deducted from posted budget
  const numWorkers = parseInt(requiredWorkers, 10) || 0;
  const unitPay = parseFloat(paymentAmount) || 0;
  const grossPayable = Math.round(numWorkers * unitPay * 100) / 100;

  const tier1Max = platformSettings?.microGigTier1MaxMembers ?? 5;
  const tier1Rate = platformSettings?.microGigTier1FeePercentage ?? 10;
  const tier2Rate = platformSettings?.microGigTier2FeePercentage ?? 5;

  const dynamicTierRate = numWorkers <= tier1Max ? tier1Rate : tier2Rate;
  const effectiveFeePercentage = isFlexiStaff
    ? (parseFloat(flexiStaffFeePercentage) || dynamicTierRate)
    : dynamicTierRate;

  const platformFee = Math.round(((grossPayable * effectiveFeePercentage) / 100) * 100) / 100;
  const netWorkerPool = Math.max(0, Math.round((grossPayable - platformFee) * 100) / 100);
  const netPayPerWorker = numWorkers > 0 ? Math.round((netWorkerPool / numWorkers) * 100) / 100 : 0;
  // Total payable escrow is the posted budget (fee is deducted from the budget, not added)
  const netTotalPayable = grossPayable;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      !title ||
      !description ||
      !category ||
      !requiredWorkers ||
      !workDate ||
      !shiftStartTime ||
      !shiftEndTime ||
      !customDuration ||
      !paymentAmount ||
      !workLocation ||
      !fullAddress ||
      latitude === undefined ||
      longitude === undefined
    ) {
      setError('Please fill in all mandatory fields and set work coordinates on the map.');
      return;
    }

    if (category === 'Others' && !customCategory.trim()) {
      setError('Please specify the custom category name for Others.');
      return;
    }

    // Open Escrow Pre-Publish Gateway Modal
    setIsEscrowModalOpen(true);
  };

  const handleEscrowSuccess = async (paymentDetails: {
    paymentMethod: string;
    paymentReference: string;
    totalAmount: number;
    platformFee: number;
  }) => {
    setIsLoading(true);
    setIsEscrowModalOpen(false);

    try {
      await api.createGig({
        title,
        description,
        category,
        customCategory: category === 'Others' ? customCategory : undefined,
        employmentType,
        requiredSkills,
        requiredWorkers: parseInt(requiredWorkers, 10),
        workDate,
        shiftStartTime,
        shiftEndTime,
        customDuration,
        paymentAmount: parseFloat(paymentAmount),
        paymentBasis,
        requiredExperience,
        workLocation,
        fullAddress,
        latitude,
        longitude,
        additionalInstructions,
        applicationDeadline,
        isFlexiStaff,
        flexiStaffDurationMonths: isFlexiStaff ? parseFloat(flexiStaffDurationMonths) || 1 : undefined,
        flexiStaffFeePercentage: isFlexiStaff ? parseFloat(flexiStaffFeePercentage) || 7.5 : undefined,
        escrowPaymentMethod: paymentDetails.paymentMethod,
        escrowReference: paymentDetails.paymentReference,
        totalEscrowAmount: paymentDetails.totalAmount,
        termsAndConditions,
      });

      navigate('/host/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to publish gig.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs font-semibold text-indigo-400">
          <Briefcase className="w-3.5 h-3.5" />
          Micro-Gig Economy & FlexiStaff Integration
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Post New Gig / Contract
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          Create a temporary shift or long-term staffing contract. All fields start blank for accurate host entry.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Details */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-indigo-400">
            1. General Gig Specifications
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Gig Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekend Event Catering Assistants (10 Positions)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Work Category <span className="text-rose-400">*</span>
              </label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="">Select Category...</option>
                {GIG_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {category === 'Others' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Custom Category Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="e.g. Solar Panel Cleaning Assistant"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Employment Type <span className="text-rose-400">*</span>
              </label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="Temporary Shift">Temporary Shift</option>
                <option value="Flexible Shift">Flexible Shift</option>
                <option value="Event Staffing">Event Staffing</option>
                <option value="Contract Basis">Contract Basis</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Gig Description <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe work responsibilities, dress code, meal provision, and reporting details..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Required Skills
              </label>
              <input
                type="text"
                value={requiredSkills}
                onChange={(e) => setRequiredSkills(e.target.value)}
                placeholder="e.g. Food handling, Customer service, Heavy lifting"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Experience Level
              </label>
              <input
                type="text"
                value={requiredExperience}
                onChange={(e) => setRequiredExperience(e.target.value)}
                placeholder="e.g. Fresher / 6+ Months / Experienced"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Schedule, Workers & Payment */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-indigo-400">
            2. Schedule, Staffing & Compensation
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Number of Workers Needed <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min={1}
                required
                value={requiredWorkers}
                onChange={(e) => setRequiredWorkers(e.target.value)}
                placeholder="e.g. 5"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Payment Amount ($) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min={1}
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="e.g. 120.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Payment Basis <span className="text-rose-400">*</span>
              </label>
              <select
                value={paymentBasis}
                onChange={(e) => setPaymentBasis(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="Per Shift">Per Shift</option>
                <option value="Hourly">Hourly</option>
                <option value="Per Day">Per Day</option>
                <option value="Milestone / Contract">Milestone / Contract</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Work Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Shift Start Time <span className="text-rose-400">*</span>
              </label>
              <input
                type="time"
                required
                value={shiftStartTime}
                onChange={(e) => setShiftStartTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Shift End Time <span className="text-rose-400">*</span>
              </label>
              <input
                type="time"
                required
                value={shiftEndTime}
                onChange={(e) => setShiftEndTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Custom Shift Duration <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                placeholder="e.g. 6 Hours / 8-Hour Full Shift"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {grossPayable > 0 && (
            <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/20 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Percent className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Platform Brokerage Fee Tier:</span>
                </span>
                <span className="font-mono px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  {numWorkers <= tier1Max ? `Standard (${tier1Rate}%) — 1 to ${tier1Max} Members` : `Bulk Tier (${tier2Rate}%) — Above ${tier1Max} Members`}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Posted Budget:</span>
                  <span className="font-mono text-white font-bold">₹{grossPayable.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Deducted Platform Fee ({effectiveFeePercentage}%):</span>
                  <span className="font-mono text-indigo-400 font-semibold">-₹{platformFee.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Net Partner Wage Pool:</span>
                  <span className="font-mono text-emerald-400 font-bold">₹{netWorkerPool.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-500 block">(₹{netPayPerWorker.toLocaleString()}/worker net)</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 italic pt-1">
                Note: The platform brokerage fee is deducted directly from your posted budget. Partners see only their net payout amount.
              </p>
            </div>
          )}
        </div>

        {/* MODULE 3.6: FlexiStaff Contract Integration */}
        <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider text-indigo-400">
                3. FlexiStaff Long-Term Contract Integration
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Enable for 1–3 month structured staffing contracts with 5% to 10% platform fee.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isFlexiStaff}
                onChange={(e) => setIsFlexiStaff(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {isFlexiStaff && (
            <div className="space-y-4 pt-3 border-t border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Contract Duration (Months)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min={1}
                    max={12}
                    value={flexiStaffDurationMonths}
                    onChange={(e) => setFlexiStaffDurationMonths(e.target.value)}
                    placeholder="e.g. 2.0 Months (Standard: 1–3)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Configurable Platform Fee (5% – 10%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min={5}
                    max={10}
                    value={flexiStaffFeePercentage}
                    onChange={(e) => setFlexiStaffFeePercentage(e.target.value)}
                    placeholder="7.5"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition font-mono"
                  />
                </div>
              </div>

              {/* Fee Breakdown Preview */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
                <div className="font-bold text-white flex items-center justify-between">
                  <span>Gross Contract Staffing Budget:</span>
                  <span className="font-mono text-white">₹{grossPayable.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-indigo-400">
                  <span>Deducted Platform Fee ({effectiveFeePercentage}%):</span>
                  <span className="font-mono font-semibold">-₹{platformFee.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-emerald-400">
                  <span>Net Partner Wage Pool:</span>
                  <span className="font-mono font-bold">₹{netWorkerPool.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-white pt-2 border-t border-slate-800">
                  <span>Total Escrow Deposit Payable:</span>
                  <span className="font-mono text-emerald-400">₹{grossPayable.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Location & Map Coordinates (MODULE 3.5 & 16) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-indigo-400">
            4. Work Location & Google Maps Geofence
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Work Location / Business Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={workLocation}
                onChange={(e) => setWorkLocation(e.target.value)}
                placeholder="e.g. Metro Mart Supermarket, Downtown"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Full Physical Address <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                placeholder="e.g. 124 Main Street, 2nd Floor, Anna Nagar"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Select Precise Coordinates on Map Radar (Required for 10–15 km search & on-site check-in) <span className="text-rose-400">*</span>
              </label>

              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={isLocating}
                className="px-3 py-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Acquiring GPS...' : 'Use My Current Location'}</span>
              </button>
            </div>

            <InteractiveMap
              selectedLat={latitude}
              selectedLng={longitude}
              onLocationSelect={(lat, lng, address) => {
                setLatitude(lat);
                setLongitude(lng);
                if (address && !fullAddress) {
                  setFullAddress(address);
                }
              }}
            />
          </div>
        </div>

        {/* Submit Button with Escrow Pre-Fund indicator */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Total Escrow Deposit Payable: <strong className="text-white font-mono">₹{netTotalPayable.toLocaleString()}</strong> (100% held in reserve)
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => navigate('/host/dashboard')}
              className="flex-1 sm:flex-none px-6 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || latitude === undefined}
              className="flex-1 sm:flex-none px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm transition shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                'Processing...'
              ) : (
                <>
                  <Lock className="w-4 h-4 text-indigo-200" />
                  <span>Publish Gig & Deposit Escrow</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Escrow Payment Gateway Modal */}
      <EscrowPaymentModal
        isOpen={isEscrowModalOpen}
        onClose={() => setIsEscrowModalOpen(false)}
        onSuccess={handleEscrowSuccess}
        gigTitle={title}
        requiredWorkers={numWorkers}
        unitPaymentAmount={unitPay}
        paymentBasis={paymentBasis}
        platformFeeRate={effectiveFeePercentage}
      />
    </div>
  );
};
