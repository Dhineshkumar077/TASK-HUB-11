import React, { useState } from 'react';
import {
  Wrench,
  ArrowRight,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle,
  ShieldCheck,
  Compass,
  Layers,
  Sparkles,
  Info,
  Navigation,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { InteractiveMap } from '../../components/InteractiveMap.tsx';
import { InlineAddressPinModal } from '../../components/InlineAddressPinModal.tsx';
import { validatePrivacyText } from '../../utils/privacyFilter.ts';

interface CreateServiceProps {
  navigate: (path: string) => void;
}

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
  id: string;
  item: string;
  amount: number;
  description?: string;
}

export const CreateService: React.FC<CreateServiceProps> = ({ navigate }) => {
  // ZERO DUMMY DATA: All form fields start strictly BLANK for fresh entry
  // 1. Service Identity
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [skills, setSkills] = useState('');
  const [conditions, setConditions] = useState('');

  // 2. Custom Pricing Model
  const [pricingBasis, setPricingBasis] = useState<'Half-Day' | 'Full-Day' | 'Custom Duration' | 'Hourly'>('Half-Day');
  const [price, setPrice] = useState('');
  const [halfDayPrice, setHalfDayPrice] = useState('');
  const [fullDayPrice, setFullDayPrice] = useState('');
  const [customDuration, setCustomDuration] = useState('');
  const [customCharges, setCustomCharges] = useState<CustomChargeItem[]>([]);
  const [newChargeItem, setNewChargeItem] = useState('');
  const [newChargeAmount, setNewChargeAmount] = useState('');
  const [newChargeDesc, setNewChargeDesc] = useState('');

  // 3. General Availability (Working Days & Operating Hours)
  const [availableWorkingDays, setAvailableWorkingDays] = useState<string[]>([]);
  const [operatingHoursStart, setOperatingHoursStart] = useState('');
  const [operatingHoursEnd, setOperatingHoursEnd] = useState('');

  // 4. Service Area Coverage & Pin-Based Map Radar (10–15 km)
  const [serviceAreaCoverage, setServiceAreaCoverage] = useState('');
  const [pinnedAddress, setPinnedAddress] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [operatingRadiusKm, setOperatingRadiusKm] = useState<number>(10); // 10 to 15 km
  const [showPinModal, setShowPinModal] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toggle working day selection
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

  // Add custom charge item
  const handleAddChargeItem = () => {
    if (!newChargeItem.trim() || !newChargeAmount || isNaN(parseFloat(newChargeAmount))) {
      setError('Please enter a valid task name and pricing amount.');
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

  const handleRemoveChargeItem = (id: string) => {
    setCustomCharges((prev) => prev.filter((c) => c.id !== id));
  };

  const coverageAreaSqKm = Math.round(Math.PI * Math.pow(operatingRadiusKm, 2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      !title ||
      !category ||
      !description ||
      !pricingBasis ||
      !price ||
      !serviceAreaCoverage.trim() ||
      latitude === undefined ||
      longitude === undefined
    ) {
      setError('Please complete all mandatory fields: title, category, description, price, service area coverage, and pin your service address on the map.');
      return;
    }

    if (category === 'Others' && !customCategory.trim()) {
      setError('Please specify the custom category name for Others.');
      return;
    }

    // Contact Info Privacy Filter (Section 3)
    const privacyCheckDesc = validatePrivacyText(description);
    const privacyCheckCov = validatePrivacyText(serviceAreaCoverage);
    const privacyCheckAddr = validatePrivacyText(pinnedAddress);
    const privacyCheckCond = validatePrivacyText(conditions);
    const privacyViolation = privacyCheckDesc.hasViolation
      ? privacyCheckDesc.reason
      : privacyCheckCov.hasViolation
      ? privacyCheckCov.reason
      : privacyCheckAddr.hasViolation
      ? privacyCheckAddr.reason
      : privacyCheckCond.hasViolation
      ? privacyCheckCond.reason
      : null;

    if (privacyViolation) {
      setError(`Contact Privacy Restriction: ${privacyViolation}`);
      return;
    }

    setIsLoading(true);

    try {
      await api.createService({
        title,
        category,
        customCategory: category === 'Others' ? customCategory : undefined,
        description,
        pricingBasis,
        price: parseFloat(price),
        halfDayPrice: halfDayPrice ? parseFloat(halfDayPrice) : undefined,
        fullDayPrice: fullDayPrice ? parseFloat(fullDayPrice) : undefined,
        customDuration: customDuration || undefined,
        customChargesBreakdown: customCharges.length > 0 ? customCharges : undefined,
        serviceAreaCoverage: serviceAreaCoverage.trim(),
        serviceArea: serviceAreaCoverage.trim(),
        pinnedAddress: pinnedAddress.trim() || undefined,
        serviceAddress: pinnedAddress.trim() || undefined,
        latitude,
        longitude,
        // Pin-Based Radar Radius (20 to 25 km)
        operatingRadiusKm,
        availableWorkingDays,
        operatingHoursStart: operatingHoursStart || undefined,
        operatingHoursEnd: operatingHoursEnd || undefined,
        experienceYears,
        qualifications,
        skills,
        conditions,
      });

      navigate('/tech/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create service listing.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-semibold text-cyan-400">
          <Wrench className="w-3.5 h-3.5" />
          Collective Local Service Marketplace
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Create Professional Service Listing
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
          Publish your technical service profile. Simply pin your service address directly on the map to automatically activate your 20–25 km operational radar.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: Service Identity & Category */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-mono">1</span>
              Service Identity & Category Scope
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">15 Certified Categories</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Service Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master Electrician — Inverter, DB Box & Complete Home Rewiring"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Service Category <span className="text-rose-400">*</span>
              </label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="">Select Category...</option>
                {SERVICE_CATEGORIES.map((cat, idx) => (
                  <option key={cat} value={cat}>
                    {idx + 1}. {cat}
                  </option>
                ))}
              </select>
            </div>

            {category === 'Others' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Custom Category Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="e.g. Chimney & Exhaust Cleaning"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Years of Experience
                </label>
                <input
                  type="text"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  placeholder="e.g. 7+ Years Certified Field Technician"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Detailed Service Description & Scope of Work <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail what the service entails, specific diagnostic procedures, tools you carry, safety protocols, and tasks you perform..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Certified Skills / Specializations
              </label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. 3-Phase Wiring, Fault Isolation, Inverter Tuning"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Qualifications / License
              </label>
              <input
                type="text"
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
                placeholder="e.g. Govt Certified Wireman License Grade A"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Custom Pricing Model */}
        {/* SECTION 2: Shift-Based & Base Visit Pricing Structure */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-mono">2</span>
                Shift-Based & Base Visit Pricing Structure
              </h2>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Define your 3 custom service tiers. These will be presented as clear, selectable options to Service Seekers.
              </span>
            </div>
            <span className="text-[11px] text-cyan-400 font-mono font-bold">3 Customer Tiers</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-1">
            {/* Tier 1: Base Visit / Hourly Rate */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-white">
                  1. Base Visit / Hourly Rate <span className="text-rose-400">*</span>
                </label>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                  Tier 1
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min={1}
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 200.00"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 pl-8 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition font-mono"
                />
              </div>
              <span className="text-[10px] text-slate-400 block leading-tight">
                Mandatory minimum baseline charge for single on-site visit, diagnosis & basic repair (up to 1 hr).
              </span>
            </div>

            {/* Tier 2: Half-Day Shift */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-white">
                  2. Half-Day Shift Charge
                </label>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                  Tier 2
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={halfDayPrice}
                  onChange={(e) => setHalfDayPrice(e.target.value)}
                  placeholder="e.g. 600.00"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 pl-8 text-sm text-white placeholder-slate-600 font-mono focus:border-cyan-500 transition"
                />
              </div>
              <span className="text-[10px] text-slate-400 block leading-tight">
                Custom half-day charge for up to 4 consecutive hours on-site work and repairs.
              </span>
            </div>

            {/* Tier 3: Full-Day Shift */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-white">
                  3. Full-Day Shift Charge
                </label>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                  Tier 3
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={fullDayPrice}
                  onChange={(e) => setFullDayPrice(e.target.value)}
                  placeholder="e.g. 1200.00"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 pl-8 text-sm text-white placeholder-slate-600 font-mono focus:border-cyan-500 transition"
                />
              </div>
              <span className="text-[10px] text-slate-400 block leading-tight">
                Comprehensive 8-hour shift coverage for extensive installations or heavy repairs.
              </span>
            </div>
          </div>

          <div className="p-3 bg-cyan-950/30 border border-cyan-500/20 rounded-xl text-[11px] text-cyan-300 flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>
              Service Seekers booking your service will choose between your Base Visit (₹{price || '200'}), Half-Day Shift (₹{halfDayPrice || '600'}), or Full-Day Shift (₹{fullDayPrice || '1200'}). Overtime beyond these blocks is automatically billed on check-out.
            </span>
          </div>

          {/* Optional Itemized Task Charges Builder */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Itemized Task / Add-on Service Rates (Optional)
                </span>
                <span className="text-[11px] text-slate-400">
                  Specify optional fixed task charges (e.g. Capacitor Replacement, Chemical Wash)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
              <div className="sm:col-span-5">
                <label className="text-[11px] text-slate-400 block mb-1">Task / Add-on Title</label>
                <input
                  type="text"
                  value={newChargeItem}
                  onChange={(e) => setNewChargeItem(e.target.value)}
                  placeholder="e.g. Motor Coil Rewinding"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="text-[11px] text-slate-400 block mb-1">Charge ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newChargeAmount}
                  onChange={(e) => setNewChargeAmount(e.target.value)}
                  placeholder="45.00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="text-[11px] text-slate-400 block mb-1">Details (Optional)</label>
                <input
                  type="text"
                  value={newChargeDesc}
                  onChange={(e) => setNewChargeDesc(e.target.value)}
                  placeholder="Includes 3-month warranty"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
                />
              </div>
              <div className="sm:col-span-1">
                <button
                  type="button"
                  onClick={handleAddChargeItem}
                  className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center transition cursor-pointer"
                  title="Add Item"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {customCharges.length > 0 && (
              <div className="space-y-2 pt-2">
                {customCharges.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-white">{c.item}</span>
                      {c.description && <span className="text-slate-500 text-[11px] ml-2">· {c.description}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-cyan-400">${c.amount.toFixed(2)}</span>
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
          </div>
        </div>

        {/* SECTION 3: General Availability (Working Days & Operating Hours) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-mono">3</span>
                General Working Days & Operating Hours
              </h2>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                General professional availability (no rigid calendar appointment slots)
              </span>
            </div>
            <button
              type="button"
              onClick={handleSelectAllDays}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
            >
              {availableWorkingDays.length === DAYS_OF_WEEK.length ? 'Deselect All' : 'Select All 7 Days'}
            </button>
          </div>

          {/* Working Days Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
              Available Working Days
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = availableWorkingDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                      isSelected
                        ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-600/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span>{day.slice(0, 3)}</span>
                    <span className="text-[9px] font-normal opacity-75">{day}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Operating Hours Windows */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Operating Hours Start
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={operatingHoursStart}
                  onChange={(e) => setOperatingHoursStart(e.target.value)}
                  placeholder="e.g. 08:30 AM"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 pl-10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Operating Hours End
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={operatingHoursEnd}
                  onChange={(e) => setOperatingHoursEnd(e.target.value)}
                  placeholder="e.g. 07:00 PM"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 pl-10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: Pin-Based Map Radar (10–15 km Radius) & Service Area Coverage */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-mono">4</span>
                Pin-Based Map Radar (10–15 km Operational Radius)
              </h2>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Pin your central dispatch location directly on the map. The system automatically enforces your strict 10 to 15 km service boundary.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block animate-pulse" />
              <span className="text-xs font-mono text-cyan-300 font-bold">{operatingRadiusKm} km Radar</span>
            </div>
          </div>

          {/* Simple Manual Service Area Coverage Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Service Area Coverage (From Where to Where) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={serviceAreaCoverage}
              onChange={(e) => setServiceAreaCoverage(e.target.value)}
              placeholder="e.g. From Anna Nagar to Velachery, Central & South Chennai"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
            />
            <span className="text-[11px] text-slate-500 mt-1.5 block">
              Manually type your coverage zones, main corridors, or neighborhood limits. External phone numbers are strictly prohibited.
            </span>
          </div>

          {/* Radar Radius Generation Control (10 to 15 km) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold text-white flex items-center gap-2">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  Operational Radar Radius (10 - 15 km)
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Select your strict dispatch boundary extending outward from your pinned map origin point.
                </p>
              </div>

              {/* Quick 10–15 km preset selector */}
              <div className="flex items-center gap-2">
                {[10, 12, 15].map((km) => (
                  <button
                    key={km}
                    type="button"
                    onClick={() => setOperatingRadiusKm(km)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
                      operatingRadiusKm === km
                        ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30 border border-cyan-400'
                        : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {km} km
                  </button>
                ))}
              </div>
            </div>

            {/* Slider control (strictly 10 km to 15 km) */}
            <div className="pt-2 space-y-2">
              <input
                type="range"
                min={10}
                max={15}
                step={1}
                value={operatingRadiusKm}
                onChange={(e) => setOperatingRadiusKm(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-500 h-2 bg-slate-900 rounded-lg cursor-pointer"
              />
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>10 km (Strict Baseline)</span>
                <span className="text-cyan-400 font-bold">~{coverageAreaSqKm.toLocaleString()} km² Coverage</span>
                <span>15 km (Extended Max)</span>
              </div>
            </div>
          </div>

          {/* Inline Address Pinning for Location Setting (Section 1.2) */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Workshop / Dispatch Origin Address <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center gap-2">
                {latitude !== undefined && longitude !== undefined && (
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    GPS: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                  </span>
                )}
                {/* Inline "Pin on Map" button */}
                <button
                  type="button"
                  onClick={() => setShowPinModal(true)}
                  className="px-3 py-1 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Pin on Focused Map
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={pinnedAddress}
                onChange={(e) => setPinnedAddress(e.target.value)}
                placeholder="Enter workshop/origin address or click Pin on Map..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowPinModal(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                Pin on Map
              </button>
            </div>

            {pinnedAddress && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0 text-cyan-400" />
                <span className="truncate">{pinnedAddress}</span>
              </div>
            )}

            <div className="rounded-2xl overflow-hidden border border-slate-800">
              <InteractiveMap
                selectedLat={latitude}
                selectedLng={longitude}
                radiusKm={operatingRadiusKm}
                showRadarBoundary={true}
                onLocationSelect={(lat, lng, addr) => {
                  setLatitude(lat);
                  setLongitude(lng);
                  if (addr) {
                    setPinnedAddress(addr);
                  }
                }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Click anywhere on the map or use the inline "Pin on Map" tool. The <strong>{operatingRadiusKm} km</strong> radar circle automatically generates centered at your pin.
            </p>
          </div>
        </div>

        {/* Focused Inline Address Pin Modal */}
        <InlineAddressPinModal
          isOpen={showPinModal}
          onClose={() => setShowPinModal(false)}
          title="Pin Workshop / Service Origin Location"
          initialLat={latitude || 13.0827}
          initialLng={longitude || 80.2707}
          initialAddress={pinnedAddress}
          onConfirmLocation={(lat, lng, addr) => {
            setLatitude(lat);
            setLongitude(lng);
            setPinnedAddress(addr);
          }}
        />

        {/* SECTION 5: Review & Submit */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-xs font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Ready for Verification & Marketplace Publication
            </span>
            <span className="text-[11px] text-slate-400 block">
              {operatingRadiusKm} km pin-based radar boundary · {serviceAreaCoverage || 'Coverage configured'}
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => navigate('/tech/dashboard')}
              className="flex-1 sm:flex-none px-6 py-3 rounded-2xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || latitude === undefined || !serviceAreaCoverage.trim()}
              className="flex-1 sm:flex-none px-8 py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition shadow-xl shadow-cyan-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                'Publishing...'
              ) : (
                <>
                  <span>Publish Service Listing</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
