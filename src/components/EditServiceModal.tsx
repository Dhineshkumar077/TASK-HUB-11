import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Wrench,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Layers,
  Sparkles,
  ShieldCheck,
  Navigation,
} from 'lucide-react';
import { ServiceListing } from '../types.ts';
import { api } from '../services/api.ts';
import { InlineAddressPinModal } from './InlineAddressPinModal.tsx';
import { validatePrivacyText } from '../utils/privacyFilter.ts';

const SERVICE_CATEGORIES = [
  'Plumber',
  'Electrician',
  'AC Technician',
  'Bike Mechanic',
  'Carpenter',
  'Painter',
  'Appliance Repair',
  'Washing Machine Repair',
  'Refrigerator Repair',
  'Computer and Laptop Repair',
  'Cleaning Services',
  'Home Maintenance',
  'Installation Services',
  'General Technician',
  'Others',
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface CustomChargeItem {
  id?: string;
  item: string;
  amount: number;
  description?: string;
}

interface EditServiceModalProps {
  isOpen: boolean;
  service: ServiceListing | null;
  onClose: () => void;
  onServiceUpdated: (updatedService: ServiceListing) => void;
}

export const EditServiceModal: React.FC<EditServiceModalProps> = ({
  isOpen,
  service,
  onClose,
  onServiceUpdated,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [skills, setSkills] = useState('');
  const [conditions, setConditions] = useState('');

  // Pricing
  const [pricingBasis, setPricingBasis] = useState<'Half-Day' | 'Full-Day' | 'Custom Duration' | 'Hourly'>('Half-Day');
  const [price, setPrice] = useState('');
  const [halfDayPrice, setHalfDayPrice] = useState('');
  const [fullDayPrice, setFullDayPrice] = useState('');
  const [overtimeHourlyRate, setOvertimeHourlyRate] = useState('');
  const [customDuration, setCustomDuration] = useState('');
  const [customCharges, setCustomCharges] = useState<CustomChargeItem[]>([]);
  const [newChargeItem, setNewChargeItem] = useState('');
  const [newChargeAmount, setNewChargeAmount] = useState('');
  const [newChargeDesc, setNewChargeDesc] = useState('');

  // Availability
  const [availableWorkingDays, setAvailableWorkingDays] = useState<string[]>([]);
  const [operatingHoursStart, setOperatingHoursStart] = useState('');
  const [operatingHoursEnd, setOperatingHoursEnd] = useState('');

  // Coverage & Pin
  const [serviceAreaCoverage, setServiceAreaCoverage] = useState('');
  const [pinnedAddress, setPinnedAddress] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [operatingRadiusKm, setOperatingRadiusKm] = useState<number>(10);
  const [isActive, setIsActive] = useState(true);

  const [showPinModal, setShowPinModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isLocked = Boolean(service?.isLocked || (service?.activeBookingsCount && service.activeBookingsCount > 0));

  // Prepopulate state whenever service changes or modal opens
  useEffect(() => {
    if (service && isOpen) {
      setTitle(service.title || '');
      setCategory(service.category || 'General Technician');
      setCustomCategory(service.customCategory || '');
      setDescription(service.description || '');
      setExperienceYears(service.experienceYears || '');
      setQualifications(service.qualifications || '');
      setSkills(service.skills || '');
      setConditions(service.conditions || '');

      setPricingBasis(service.pricingBasis || 'Half-Day');
      setPrice(service.price ? String(service.price) : '');
      setHalfDayPrice(service.halfDayPrice ? String(service.halfDayPrice) : '');
      setFullDayPrice(service.fullDayPrice ? String(service.fullDayPrice) : '');
      setOvertimeHourlyRate(service.overtimeHourlyRate ? String(service.overtimeHourlyRate) : '');
      setCustomDuration(service.customDuration || '');

      setCustomCharges(
        Array.isArray(service.customChargesBreakdown)
          ? service.customChargesBreakdown.map((c, i) => ({ ...c, id: String(i) }))
          : []
      );

      setAvailableWorkingDays(service.availableWorkingDays || [...DAYS_OF_WEEK]);
      setOperatingHoursStart(service.operatingHoursStart || '09:00 AM');
      setOperatingHoursEnd(service.operatingHoursEnd || '07:00 PM');

      setServiceAreaCoverage(service.serviceAreaCoverage || service.serviceArea || '');
      setPinnedAddress(service.pinnedAddress || service.serviceAddress || '');
      setLatitude(service.latitude);
      setLongitude(service.longitude);
      setOperatingRadiusKm(service.operatingRadiusKm || 10);
      setIsActive(service.isActive !== false);

      setError(null);
      setSuccessMsg(null);
    }
  }, [service, isOpen]);

  if (!isOpen || !service) return null;

  const toggleDay = (day: string) => {
    setAvailableWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSelectAllDays = () => {
    if (availableWorkingDays.length === DAYS_OF_WEEK.length) {
      setAvailableWorkingDays([]);
    } else {
      setAvailableWorkingDays([...DAYS_OF_WEEK]);
    }
  };

  const handleAddChargeItem = () => {
    if (!newChargeItem.trim() || !newChargeAmount || isNaN(parseFloat(newChargeAmount))) {
      setError('Please enter a valid task name and amount.');
      return;
    }
    setCustomCharges((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        item: newChargeItem.trim(),
        amount: parseFloat(newChargeAmount),
        description: newChargeDesc.trim() || undefined,
      },
    ]);
    setNewChargeItem('');
    setNewChargeAmount('');
    setNewChargeDesc('');
    setError(null);
  };

  const handleRemoveChargeItem = (id?: string) => {
    setCustomCharges((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (isLocked) {
      setError(
        'Editing Locked: This service currently has active client bookings with locked escrow funds. Post-booking rate manipulation is strictly prohibited under platform financial integrity protocols.'
      );
      return;
    }

    if (!title.trim()) {
      setError('Please provide a service title.');
      return;
    }
    if (!category) {
      setError('Please select a certified trade category.');
      return;
    }
    if (category === 'Others' && !customCategory.trim()) {
      setError('Please specify your custom category trade name.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a service overview description.');
      return;
    }
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      setError('Please provide a valid base inspection or service price.');
      return;
    }
    if (!serviceAreaCoverage.trim()) {
      setError('Please specify service area coverage neighborhoods or localities.');
      return;
    }

    // Privacy check
    const checkDesc = validatePrivacyText(description);
    if (checkDesc.hasViolation) {
      setError(`Privacy Violation in Description: ${checkDesc.reason}`);
      return;
    }
    const checkCoverage = validatePrivacyText(serviceAreaCoverage);
    if (checkCoverage.hasViolation) {
      setError(`Privacy Violation in Coverage: ${checkCoverage.reason}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        category,
        customCategory: category === 'Others' ? customCategory.trim() : undefined,
        description: description.trim(),
        pricingBasis,
        price: parseFloat(price),
        halfDayPrice: halfDayPrice ? parseFloat(halfDayPrice) : undefined,
        fullDayPrice: fullDayPrice ? parseFloat(fullDayPrice) : undefined,
        overtimeHourlyRate: overtimeHourlyRate ? parseFloat(overtimeHourlyRate) : undefined,
        customDuration: customDuration.trim() || undefined,
        customChargesBreakdown: customCharges.map(({ item, amount, description }) => ({
          item,
          amount,
          description,
        })),
        availableWorkingDays,
        operatingHoursStart: operatingHoursStart.trim() || undefined,
        operatingHoursEnd: operatingHoursEnd.trim() || undefined,
        serviceAreaCoverage: serviceAreaCoverage.trim(),
        serviceArea: serviceAreaCoverage.trim(),
        pinnedAddress: pinnedAddress.trim() || undefined,
        serviceAddress: pinnedAddress.trim() || undefined,
        latitude,
        longitude,
        operatingRadiusKm,
        experienceYears: experienceYears.trim() || undefined,
        qualifications: qualifications.trim() || undefined,
        skills: skills.trim() || undefined,
        conditions: conditions.trim() || undefined,
        isActive,
      };

      const res = await api.updateService(service.id, payload);
      setSuccessMsg('Service details updated and saved to database successfully!');
      if (res.service) {
        onServiceUpdated(res.service);
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Failed to update service listing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-4">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                <Wrench className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-black text-white">Edit Published Service</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Update pricing, shift rates, coverage area, and operating details in real-time.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLocked && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-amber-200">
                  Rate Modification Locked — Active Escrow Engagements
                </div>
                <p className="text-[11px] text-amber-300/80 leading-relaxed">
                  This service currently has active customer bookings or locked escrow funds. Post-booking rate manipulation is strictly prohibited under platform financial integrity protocols.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: Basic Identity */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              1. Service Identity & Category
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Service Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Master Electrician • Home Wiring & Inverter Setup"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Trade Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
                >
                  {SERVICE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {category === 'Others' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Custom Trade Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="e.g. Solar Rooftop Specialist"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                    />
                    <span>Listing Active in Marketplace</span>
                  </label>
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Service Description & Capabilities *
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your tools, equipment, diagnostic process, and quality guarantees..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Shift-Based Pricing Model */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              2. Shift & Overtime Pricing Structure (₹ INR)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Base / Hourly Rate (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-500">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    disabled={isLocked}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 250"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">Hourly/inspection baseline</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Half-Day Shift Rate (4h) (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-500">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    disabled={isLocked}
                    value={halfDayPrice}
                    onChange={(e) => setHalfDayPrice(e.target.value)}
                    placeholder="e.g. 450"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">Prepaid 4-hour shift slot</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full-Day Shift Rate (8h) (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-500">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    disabled={isLocked}
                    value={fullDayPrice}
                    onChange={(e) => setFullDayPrice(e.target.value)}
                    placeholder="e.g. 800"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">Full-day coverage slot</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Overtime Hourly Rate (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-500">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    disabled={isLocked}
                    value={overtimeHourlyRate}
                    onChange={(e) => setOvertimeHourlyRate(e.target.value)}
                    placeholder="e.g. 150"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">Per hour past shift limit</span>
              </div>
            </div>

            {/* Custom Charges Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-300 block">
                Custom Task Charges Breakdown (Optional)
              </span>

              {customCharges.length > 0 && (
                <div className="space-y-2">
                  {customCharges.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                    >
                      <div>
                        <span className="font-bold text-white">{c.item}</span>
                        {c.description && (
                          <span className="text-slate-400 ml-2">({c.description})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-emerald-400">₹{c.amount}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveChargeItem(c.id)}
                          className="text-slate-500 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Task Item (e.g. Capacitor Replacement)"
                  value={newChargeItem}
                  onChange={(e) => setNewChargeItem(e.target.value)}
                  className="sm:col-span-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
                <input
                  type="number"
                  placeholder="Cost (₹)"
                  value={newChargeAmount}
                  onChange={(e) => setNewChargeAmount(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddChargeItem}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold transition flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Task
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Availability & Hours */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                3. Working Days & Operating Hours
              </h3>
              <button
                type="button"
                onClick={handleSelectAllDays}
                className="text-[11px] font-semibold text-cyan-400 hover:underline"
              >
                {availableWorkingDays.length === DAYS_OF_WEEK.length ? 'Clear All' : 'Select All Days'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const selected = availableWorkingDays.includes(day);
                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                      selected
                        ? 'bg-cyan-600/20 border-cyan-500/50 text-cyan-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Operating Hours From
                </label>
                <input
                  type="text"
                  value={operatingHoursStart}
                  onChange={(e) => setOperatingHoursStart(e.target.value)}
                  placeholder="e.g. 08:00 AM"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Operating Hours To
                </label>
                <input
                  type="text"
                  value={operatingHoursEnd}
                  onChange={(e) => setOperatingHoursEnd(e.target.value)}
                  placeholder="e.g. 08:00 PM"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Service Area Coverage & Radar */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              4. Service Area Coverage & Operational Radar
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Service Area Neighborhoods / Localities *
              </label>
              <input
                type="text"
                required
                value={serviceAreaCoverage}
                onChange={(e) => setServiceAreaCoverage(e.target.value)}
                placeholder="e.g. Adyar, Guindy, Velachery, Besant Nagar, Thiruvanmiyur"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Pinned Base Hub Address
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pinnedAddress}
                    onChange={(e) => setPinnedAddress(e.target.value)}
                    placeholder="e.g. 1st Main Rd, Gandhi Nagar, Adyar"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPinModal(true)}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold border border-slate-700 flex items-center gap-1.5 shrink-0"
                    title="Pin on Map"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Map</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Operational Radar Boundary: {operatingRadiusKm} km
                </label>
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="range"
                    min="10"
                    max="15"
                    step="1"
                    value={operatingRadiusKm}
                    onChange={(e) => setOperatingRadiusKm(parseInt(e.target.value, 10))}
                    className="flex-1 accent-cyan-500 cursor-pointer"
                  />
                  <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-800/60 shrink-0">
                    {operatingRadiusKm} km
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Qualifications & Experience */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              5. Professional Credentials & Skills
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Experience (Years)
                </label>
                <input
                  type="text"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  placeholder="e.g. 7+ Years"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Certifications / Qualifications
                </label>
                <input
                  type="text"
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                  placeholder="e.g. ITI Certified, Govt License"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Skills Keywords
                </label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. Wiring, MCB, Inverter, Earthing"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                isActive
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              {isActive ? '● Active in Search' : '○ Paused / Inactive'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isLocked}
              className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-cyan-600/30"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Changes...' : isLocked ? 'Locked (Active Escrow)' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Map Pin Modal */}
      {showPinModal && (
        <InlineAddressPinModal
          isOpen={showPinModal}
          onClose={() => setShowPinModal(false)}
          initialLat={latitude || 13.0827}
          initialLng={longitude || 80.2707}
          initialAddress={pinnedAddress}
          onConfirmLocation={(lat, lng, addr) => {
            setLatitude(lat);
            setLongitude(lng);
            setPinnedAddress(addr);
            setShowPinModal(false);
          }}
        />
      )}
    </div>
  );
};
