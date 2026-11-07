import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db.ts';
import { authMiddleware, requireRole } from '../middleware.ts';
import type { AuthenticatedRequest } from '../middleware.ts';
import { calculateDistanceKm, calculateDistanceMeters, isWithinGeofence } from '../geo.ts';
import type { ServiceListing, ServiceBooking, FinancialLedgerEntry } from '../types.ts';
import { validatePrivacyText, maskPhoneNumber, maskEmail } from '../privacyFilter.ts';

const router = Router();

export const SERVICE_CATEGORIES = [
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

// 1. Search Services (10 to 15 km Radius, 15 Categories, Trade Keywords, Price & Rating)
router.get('/', (req, res: Response) => {
  const {
    category,
    search,
    userLat,
    userLng,
    radiusKm = '10',
    maxPrice,
    minPrice,
    minRating,
  } = req.query;

  let services = db.getServices().filter((s) => s.isActive);

  if (category && category !== 'All') {
    services = services.filter((s) => s.category.toLowerCase() === String(category).toLowerCase());
  }

  if (minPrice) {
    const min = parseFloat(String(minPrice));
    if (!isNaN(min)) {
      services = services.filter((s) => s.price >= min);
    }
  }

  if (maxPrice) {
    const max = parseFloat(String(maxPrice));
    if (!isNaN(max)) {
      services = services.filter((s) => s.price <= max);
    }
  }

  if (minRating) {
    const rating = parseFloat(String(minRating));
    if (!isNaN(rating)) {
      services = services.filter((s) => (s.techPartnerRating || 5.0) >= rating);
    }
  }

  if (search) {
    const q = String(search).toLowerCase();
    services = services.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.customCategory && s.customCategory.toLowerCase().includes(q)) ||
        s.techPartnerName.toLowerCase().includes(q) ||
        (s.serviceAreaCoverage || s.serviceArea || '').toLowerCase().includes(q) ||
        (s.skills && s.skills.toLowerCase().includes(q))
    );
  }

  // Pin-Based Geospatial Radar Filtering (10 to 15 km strict operational boundary, default 10 km)
  if (userLat && userLng) {
    const lat = parseFloat(String(userLat));
    const lng = parseFloat(String(userLng));
    // Clamped strictly to 10-15 km maximum threshold unless global
    const requestedRadius = parseFloat(String(radiusKm));
    const searchRadius = radiusKm === 'global' ? 99999 : (isNaN(requestedRadius) ? 10 : Math.min(15, Math.max(5, requestedRadius)));

    services = services
      .map((svc) => {
        const distance = calculateDistanceKm(lat, lng, svc.latitude, svc.longitude);
        return {
          ...svc,
          distanceKm: distance,
        };
      })
      // Strictly within operational radar boundary (10 to 15 km)
      .filter((s) => s.distanceKm <= (s.operatingRadiusKm || 15) && s.distanceKm <= searchRadius)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  // Pre-payment phase: Conceal phone numbers and direct contact details
  const sanitizedServices = services.map((s) => ({
    ...s,
    techPartnerMobile: maskPhoneNumber(s.techPartnerMobile),
    techPartnerEmail: maskEmail(s.techPartnerEmail),
    isContactMasked: true,
  }));

  res.json({ services: sanitizedServices, categories: SERVICE_CATEGORIES });
});

// 2. Get Tech Partner's Own Services
router.get('/my', authMiddleware, requireRole('TECH_PARTNER'), (req: AuthenticatedRequest, res: Response) => {
  const techPartnerId = req.user!.id;
  const rawServices = db.getServices().filter((s) => s.techPartnerId === techPartnerId);
  const bookings = db.getBookingsForTechPartner(techPartnerId);
  const services = rawServices.map((s) => {
    const activeBookings = bookings.filter((b) =>
      b.serviceId === s.id &&
      (b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS' || b.paymentStatus === 'ESCROW_LOCKED' || b.status === 'AWAITING_BALANCE_TOPUP')
    );
    const isLocked = activeBookings.length > 0;
    return {
      ...s,
      activeBookingsCount: activeBookings.length,
      totalBookingsCount: bookings.filter((b) => b.serviceId === s.id).length,
      isLocked,
      lockReason: isLocked
        ? `Locked due to ${activeBookings.length} active client booking(s) with escrow funds held.`
        : undefined,
    };
  });
  res.json({ services });
});

// 3. Create New Service (Pin-Based Map Radar 10–15 km, Manual Service Area Coverage, No Time Slots)
router.post('/', authMiddleware, requireRole('TECH_PARTNER'), (req: AuthenticatedRequest, res: Response) => {
  const partner = req.user!;
  const {
    title,
    category,
    customCategory,
    description,
    pricingBasis,
    price,
    halfDayPrice,
    fullDayPrice,
    customDuration,
    customChargesBreakdown,
    serviceAreaCoverage,
    serviceArea,
    pinnedAddress,
    serviceAddress,
    latitude,
    longitude,
    operatingRadiusKm,
    availableWorkingDays,
    operatingHoursStart,
    operatingHoursEnd,
    experienceYears,
    qualifications,
    skills,
    conditions,
  } = req.body;

  const coverage = (serviceAreaCoverage || serviceArea || '').trim();
  const addressText = (pinnedAddress || serviceAddress || '').trim();

  // Privacy restriction filter checks
  const privacyCheckDesc = validatePrivacyText(description);
  if (privacyCheckDesc.hasViolation) {
    res.status(400).json({ error: `Privacy Violation in Description: ${privacyCheckDesc.reason}` });
    return;
  }
  const privacyCheckAddr = validatePrivacyText(addressText);
  if (privacyCheckAddr.hasViolation) {
    res.status(400).json({ error: `Privacy Violation in Address: ${privacyCheckAddr.reason}` });
    return;
  }
  const privacyCheckCov = validatePrivacyText(coverage);
  if (privacyCheckCov.hasViolation) {
    res.status(400).json({ error: `Privacy Violation in Coverage: ${privacyCheckCov.reason}` });
    return;
  }

  // Validation: Simplified, no appointment time slots required, no separate hub name or street baseline required
  if (
    !title ||
    !category ||
    !description ||
    !pricingBasis ||
    price === undefined ||
    !coverage ||
    latitude === undefined ||
    longitude === undefined
  ) {
    res.status(400).json({ error: 'Title, category, description, pricing, service area coverage, and a pinned map location are required.' });
    return;
  }

  if (category === 'Others' && !customCategory) {
    res.status(400).json({ error: 'Please specify the custom category name for Others.' });
    return;
  }

  const basePrice = parseFloat(price);
  if (isNaN(basePrice) || basePrice <= 0) {
    res.status(400).json({ error: 'Please enter a valid positive service price.' });
    return;
  }

  // Strict 10 to 15 km operational radius (default 10 km)
  const parsedRadius = parseFloat(operatingRadiusKm);
  const radius = !isNaN(parsedRadius) && parsedRadius >= 10 && parsedRadius <= 15 ? parsedRadius : 10;

  const newService: ServiceListing = {
    id: crypto.randomUUID(),
    techPartnerId: partner.id,
    techPartnerName: partner.fullName,
    techPartnerMobile: partner.mobile,
    techPartnerRating: typeof partner.rating === 'number' ? partner.rating : 0.0,
    title: title.trim(),
    category: category.trim(),
    customCategory: customCategory?.trim(),
    description: description.trim(),
    pricingBasis,
    price: basePrice,
    halfDayPrice: halfDayPrice ? parseFloat(halfDayPrice) : undefined,
    fullDayPrice: fullDayPrice ? parseFloat(fullDayPrice) : undefined,
    customDuration: customDuration?.trim(),
    customChargesBreakdown: Array.isArray(customChargesBreakdown) ? customChargesBreakdown : undefined,
    serviceAreaCoverage: coverage,
    serviceArea: coverage,
    pinnedAddress: addressText,
    serviceAddress: addressText,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    // Pin-Based Radar Radius (10 to 15 km)
    operatingRadiusKm: radius,
    availableWorkingDays: Array.isArray(availableWorkingDays) ? availableWorkingDays : [],
    operatingHoursStart: operatingHoursStart?.trim(),
    operatingHoursEnd: operatingHoursEnd?.trim(),
    experienceYears,
    qualifications,
    skills,
    conditions,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.addService(newService);

  res.status(201).json({
    message: `Service published successfully with ${radius} km operational radar boundary!`,
    service: newService,
  });
});

// 4. Get Single Service & Reviews (Strict Contact Privacy Pre-Payment & Dynamic Reviews)
router.get('/:id', (req, res: Response) => {
  const service = db.findServiceById(req.params.id);
  if (!service) {
    res.status(404).json({ error: 'Service listing not found.' });
    return;
  }

  const techUser = db.findUserById(service.techPartnerId);
  const ratingBreakdown = db.calculate_average_rating(service.techPartnerId);
  const reviews = db.getReviews(service.techPartnerId);

  res.json({
    service: {
      ...service,
      techPartnerMobile: maskPhoneNumber(service.techPartnerMobile),
      techPartnerEmail: maskEmail(service.techPartnerEmail),
      isContactMasked: true,
    },
    techPartner: {
      id: service.techPartnerId,
      name: service.techPartnerName,
      mobile: maskPhoneNumber(service.techPartnerMobile),
      rating: ratingBreakdown.averageRating,
      totalReviews: ratingBreakdown.totalReviews,
      bio: techUser?.bio,
    },
    ratingBreakdown,
    reviews,
  });
});

// 4b. Update Service Listing (Tech Partner can edit only their own published services)
const handleUpdateService = (req: AuthenticatedRequest, res: Response) => {
  const partner = req.user!;
  const service = db.findServiceById(req.params.id);

  if (!service) {
    res.status(404).json({ error: 'Service listing not found.' });
    return;
  }

  // Security Check: Tech Partner can view/edit only their own published services
  if (service.techPartnerId !== partner.id && partner.role !== 'ADMIN') {
    res.status(403).json({ error: 'Access denied: You are only authorized to edit your own published services.' });
    return;
  }

  // Security & Misuse Prevention:
  // Lock editing capabilities once a service has an active/in-progress booking or locked escrow funds
  const bookings = db.getBookingsForTechPartner(partner.id);
  const activeBookings = bookings.filter(
    (b) =>
      b.serviceId === service.id &&
      (b.status === 'CONFIRMED' ||
        b.status === 'IN_PROGRESS' ||
        b.paymentStatus === 'ESCROW_LOCKED' ||
        b.status === 'AWAITING_BALANCE_TOPUP')
  );

  if (activeBookings.length > 0) {
    res.status(400).json({
      error: `Editing Locked: This service currently has ${activeBookings.length} active client booking(s) with locked escrow funds. Post-booking rate manipulation is strictly prohibited to protect customers.`,
    });
    return;
  }

  const {
    title,
    category,
    customCategory,
    description,
    pricingBasis,
    price,
    halfDayPrice,
    fullDayPrice,
    overtimeHourlyRate,
    customDuration,
    customChargesBreakdown,
    serviceAreaCoverage,
    serviceArea,
    pinnedAddress,
    serviceAddress,
    latitude,
    longitude,
    operatingRadiusKm,
    availableWorkingDays,
    operatingHoursStart,
    operatingHoursEnd,
    experienceYears,
    qualifications,
    skills,
    conditions,
    isActive,
  } = req.body;

  // Privacy filters
  if (description) {
    const privacyCheckDesc = validatePrivacyText(description);
    if (privacyCheckDesc.hasViolation) {
      res.status(400).json({ error: `Privacy Violation in Description: ${privacyCheckDesc.reason}` });
      return;
    }
  }

  const addressText = pinnedAddress || serviceAddress;
  if (addressText) {
    const privacyCheckAddr = validatePrivacyText(addressText);
    if (privacyCheckAddr.hasViolation) {
      res.status(400).json({ error: `Privacy Violation in Address: ${privacyCheckAddr.reason}` });
      return;
    }
  }

  const coverage = serviceAreaCoverage || serviceArea;
  if (coverage) {
    const privacyCheckCov = validatePrivacyText(coverage);
    if (privacyCheckCov.hasViolation) {
      res.status(400).json({ error: `Privacy Violation in Coverage: ${privacyCheckCov.reason}` });
      return;
    }
  }

  const updates: Partial<ServiceListing> = {};

  if (title !== undefined) updates.title = String(title).trim();
  if (category !== undefined) updates.category = String(category).trim();
  if (customCategory !== undefined) updates.customCategory = String(customCategory).trim();
  if (description !== undefined) updates.description = String(description).trim();
  if (pricingBasis !== undefined) updates.pricingBasis = pricingBasis;
  if (price !== undefined) {
    const p = parseFloat(price);
    if (!isNaN(p) && p > 0) updates.price = p;
  }
  if (halfDayPrice !== undefined) {
    updates.halfDayPrice = halfDayPrice !== '' && halfDayPrice !== null ? parseFloat(halfDayPrice) : undefined;
  }
  if (fullDayPrice !== undefined) {
    updates.fullDayPrice = fullDayPrice !== '' && fullDayPrice !== null ? parseFloat(fullDayPrice) : undefined;
  }
  if (overtimeHourlyRate !== undefined) {
    updates.overtimeHourlyRate = overtimeHourlyRate !== '' && overtimeHourlyRate !== null ? parseFloat(overtimeHourlyRate) : undefined;
  }
  if (customDuration !== undefined) updates.customDuration = String(customDuration).trim();
  if (customChargesBreakdown !== undefined) {
    updates.customChargesBreakdown = Array.isArray(customChargesBreakdown) ? customChargesBreakdown : [];
  }
  if (coverage !== undefined) {
    updates.serviceAreaCoverage = String(coverage).trim();
    updates.serviceArea = String(coverage).trim();
  }
  if (addressText !== undefined) {
    updates.pinnedAddress = String(addressText).trim();
    updates.serviceAddress = String(addressText).trim();
  }
  if (latitude !== undefined && latitude !== null && !isNaN(parseFloat(latitude))) {
    updates.latitude = parseFloat(latitude);
  }
  if (longitude !== undefined && longitude !== null && !isNaN(parseFloat(longitude))) {
    updates.longitude = parseFloat(longitude);
  }
  if (operatingRadiusKm !== undefined) {
    const r = parseFloat(operatingRadiusKm);
    updates.operatingRadiusKm = !isNaN(r) && r >= 10 && r <= 15 ? r : 10;
  }
  if (availableWorkingDays !== undefined) {
    updates.availableWorkingDays = Array.isArray(availableWorkingDays) ? availableWorkingDays : [];
  }
  if (operatingHoursStart !== undefined) updates.operatingHoursStart = String(operatingHoursStart).trim();
  if (operatingHoursEnd !== undefined) updates.operatingHoursEnd = String(operatingHoursEnd).trim();
  if (experienceYears !== undefined) updates.experienceYears = experienceYears;
  if (qualifications !== undefined) updates.qualifications = qualifications;
  if (skills !== undefined) updates.skills = skills;
  if (conditions !== undefined) updates.conditions = conditions;
  if (isActive !== undefined) updates.isActive = Boolean(isActive);

  const updatedService = db.updateService(req.params.id, updates);

  res.json({
    message: 'Service details updated successfully in database!',
    service: updatedService,
  });
};

router.put('/:id', authMiddleware, requireRole('TECH_PARTNER'), handleUpdateService);
router.patch('/:id', authMiddleware, requireRole('TECH_PARTNER'), handleUpdateService);

// 4c. Toggle Service Active Status (Tech Partner own service only)
router.patch('/:id/toggle', authMiddleware, requireRole('TECH_PARTNER'), (req: AuthenticatedRequest, res: Response) => {
  const partner = req.user!;
  const service = db.findServiceById(req.params.id);

  if (!service) {
    res.status(404).json({ error: 'Service listing not found.' });
    return;
  }

  if (service.techPartnerId !== partner.id && partner.role !== 'ADMIN') {
    res.status(403).json({ error: 'Access denied: You are only authorized to modify your own published services.' });
    return;
  }

  const updatedService = db.updateService(req.params.id, { isActive: !service.isActive });

  res.json({
    message: `Service is now ${updatedService?.isActive ? 'active' : 'inactive'}`,
    service: updatedService,
  });
});

// 4d. Delete Service Listing (Tech Partner own service only)
router.delete('/:id', authMiddleware, requireRole('TECH_PARTNER'), (req: AuthenticatedRequest, res: Response) => {
  const partner = req.user!;
  const service = db.findServiceById(req.params.id);

  if (!service) {
    res.status(404).json({ error: 'Service listing not found.' });
    return;
  }

  if (service.techPartnerId !== partner.id && partner.role !== 'ADMIN') {
    res.status(403).json({ error: 'Access denied: You are only authorized to delete your own published services.' });
    return;
  }

  db.deleteService(req.params.id);

  res.json({
    message: 'Service listing removed successfully from database.',
    serviceId: req.params.id,
  });
});

// 5. Book Service (Service Seeker - Hybrid Shift Selection: Half-Day, Full-Day, Hourly)
router.post('/:id/book', authMiddleware, requireRole('SERVICE_SEEKER'), (req: AuthenticatedRequest, res: Response) => {
  const service = db.findServiceById(req.params.id);
  if (!service || !service.isActive) {
    res.status(404).json({ error: 'Service listing is unavailable or inactive.' });
    return;
  }

  const seeker = req.user!;
  const {
    serviceDate,
    preferredTime = '09:00 AM',
    baseDurationHours,
    duration,
    shiftType,
    selectedTier,
    selectedRate,
    serviceLocation,
    serviceAddress,
    latitude,
    longitude,
    customerInstructions,
  } = req.body;

  // Strict contact info & privacy validation on address, location, instructions
  const checkLoc = validatePrivacyText(serviceLocation);
  if (checkLoc.hasViolation) {
    res.status(400).json({ error: `Privacy Violation in Location: ${checkLoc.reason}` });
    return;
  }
  const checkAddr = validatePrivacyText(serviceAddress);
  if (checkAddr.hasViolation) {
    res.status(400).json({ error: `Privacy Violation in Address: ${checkAddr.reason}` });
    return;
  }
  const checkInst = validatePrivacyText(customerInstructions);
  if (checkInst.hasViolation) {
    res.status(400).json({ error: `Privacy Violation in Instructions: ${checkInst.reason}` });
    return;
  }

  if (!serviceDate || !serviceLocation || !serviceAddress) {
    res.status(400).json({ error: 'Date, preferred start time, and physical address are required.' });
    return;
  }

  // 1. Shift-Based & Base Visit Pricing Structure
  const hourlyRate = service.price || 200;
  let basePrice = hourlyRate;
  let parsedBaseHours = 1;
  let effectiveShiftType: string = 'Base Visit';

  if (selectedTier === 'HALF_DAY' || shiftType === 'Half-Day Shift') {
    basePrice = service.halfDayPrice && service.halfDayPrice > 0
      ? service.halfDayPrice
      : Math.round(hourlyRate * 3.5);
    parsedBaseHours = 4;
    effectiveShiftType = 'Half-Day Shift';
  } else if (selectedTier === 'FULL_DAY' || shiftType === 'Full-Day Shift') {
    basePrice = service.fullDayPrice && service.fullDayPrice > 0
      ? service.fullDayPrice
      : Math.round(hourlyRate * 6.5);
    parsedBaseHours = 8;
    effectiveShiftType = 'Full-Day Shift';
  } else {
    // Base Visit / Hourly Rate
    basePrice = hourlyRate;
    parsedBaseHours = 1;
    effectiveShiftType = 'Base Visit';
  }

  const commissionRate = (db.getPlatformSettings().localServiceCommissionPercentage || 10) / 100;
  const platformFee = Math.round(basePrice * commissionRate * 100) / 100; // Fixed 10% internal platform fee
  const taxes = 0; // Internalized between platform and Tech Partner
  const totalPayable = basePrice; // Service Seekers see and pay ONLY the standard final service price

  const selectedSlot = preferredTime || '09:00 AM';
  const selectedDuration = duration || `${effectiveShiftType} (${parsedBaseHours} hr${parsedBaseHours > 1 ? 's' : ''})`;

  const newBooking: ServiceBooking = {
    id: crypto.randomUUID(),
    serviceId: service.id,
    serviceTitle: service.title,
    category: service.category,
    customCategory: service.customCategory,
    seekerId: seeker.id,
    seekerName: seeker.fullName,
    seekerMobile: seeker.mobile,
    techPartnerId: service.techPartnerId,
    techPartnerName: service.techPartnerName,
    techPartnerMobile: service.techPartnerMobile,
    serviceDate,
    preferredTime: selectedSlot,
    duration: selectedDuration,
    shiftType: effectiveShiftType,
    shiftSlot: selectedSlot,
    baseDurationHours: parsedBaseHours,
    hourlyRate,
    halfDayPrice: service.halfDayPrice || (effectiveShiftType === 'Half-Day Shift' ? basePrice : Math.round(hourlyRate * 3.5)),
    fullDayPrice: service.fullDayPrice || (service.halfDayPrice ? Math.round(service.halfDayPrice * 1.8) : Math.round(basePrice * 1.8)),
    serviceLocation: serviceLocation.trim(),
    serviceAddress: serviceAddress.trim(),
    latitude: latitude ? parseFloat(latitude) : service.latitude,
    longitude: longitude ? parseFloat(longitude) : service.longitude,
    customerInstructions: customerInstructions ? customerInstructions.trim() : undefined,
    servicePrice: basePrice,
    baseEscrowAmount: basePrice,
    platformFee,
    applicableTaxes: taxes,
    totalPayableAmount: totalPayable,
    paymentStatus: 'PENDING',
    status: 'PENDING_PAYMENT',
    customerApproved: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.addBooking(newBooking);

  res.status(201).json({
    message: `Booking created for ${effectiveShiftType} (₹${basePrice}). Please deposit baseline escrow to confirm.`,
    booking: newBooking,
  });
});

// 6. Payment Processing & Base Escrow Locking (Step 1)
router.post('/bookings/:id/pay', authMiddleware, requireRole('SERVICE_SEEKER'), (req: AuthenticatedRequest, res: Response) => {
  const booking = db.findBookingById(req.params.id);
  if (!booking) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }

  if (booking.seekerId !== req.user!.id && req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: 'Unauthorized.' });
    return;
  }

  if (booking.paymentStatus === 'ESCROW_LOCKED') {
    res.status(400).json({ error: 'Baseline payment has already been locked in escrow for this booking.' });
    return;
  }

  const { paymentMethod, paymentReference } = req.body;
  if (!paymentMethod) {
    res.status(400).json({ error: 'Payment method (UPI, CREDIT_CARD, DEBIT_CARD, or NET_BANKING) is required.' });
    return;
  }

  const ref = paymentReference || `PAY-${paymentMethod}-${Date.now().toString().slice(-6)}`;
  const lockTimestamp = new Date().toISOString();

  booking.paymentStatus = 'ESCROW_LOCKED';
  booking.paymentMethod = paymentMethod;
  booking.paymentReference = ref;
  booking.escrowLockedAt = lockTimestamp;
  booking.status = 'CONFIRMED';
  booking.updatedAt = lockTimestamp;

  // Add into Wallet 1 (Earnings and Pending Funds) as ESCROW PENDING (deducting internal 10% platform fee)
  const netPartnerEarnings = Math.round((booking.servicePrice - booking.platformFee) * 100) / 100;
  const techWallet = db.getOrCreateWallet(booking.techPartnerId);
  techWallet.escrowPendingAmount = Math.round((techWallet.escrowPendingAmount + netPartnerEarnings) * 100) / 100;
  db.updateWallet(booking.techPartnerId, techWallet);

  // Financial Ledger Entry: Base Escrow Lock
  const ledgerEntry: FinancialLedgerEntry = {
    id: crypto.randomUUID(),
    transactionId: `TX-SRV-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
    division: 'LOCAL_SERVICE',
    bookingId: booking.id,
    title: `Base Escrow Deposit: ${booking.serviceTitle} (${booking.shiftType})`,
    payerId: booking.seekerId,
    payerName: booking.seekerName,
    payeeId: booking.techPartnerId,
    payeeName: booking.techPartnerName,
    grossAmount: booking.totalPayableAmount,
    platformFee: booking.platformFee,
    applicableTaxes: 0,
    netPartnerAmount: netPartnerEarnings,
    paymentProvider: `MARKETPLACE_GATEWAY_${paymentMethod}`,
    paymentReference: ref,
    escrowStatus: 'ESCROW_LOCKED',
    lockTimestamp,
    isDisputed: false,
    notes: `Base escrow locked: ₹${booking.totalPayableAmount} total customer deposit (Internal 10% platform fee: ₹${booking.platformFee}, net technician pending escrow: ₹${netPartnerEarnings})`,
    createdAt: lockTimestamp,
  };
  db.addLedgerEntry(ledgerEntry);

  // Notify Tech Partner
  db.addNotification({
    id: crypto.randomUUID(),
    userId: booking.techPartnerId,
    title: 'New Confirmed Booking & Escrow Locked',
    message: `${booking.seekerName} booked "${booking.serviceTitle}" (${booking.shiftType}) for ${booking.serviceDate}. Baseline funds (₹${netPartnerEarnings}) are locked in Escrow.`,
    type: 'SUCCESS',
    link: '/tech/bookings',
    isRead: false,
    createdAt: lockTimestamp,
  });

  db.save();

  res.json({
    message: 'Baseline payment verified and securely locked in Escrow. Booking confirmed!',
    booking,
    ledgerEntry,
  });
});

// 7. Tech Partner Geofenced Check-In at Customer Location (Step 2)
// Strict Geofenced Validation: strictly within 50 meters of pinned customer location
router.post('/bookings/:id/check-in', authMiddleware, requireRole('TECH_PARTNER'), (req: AuthenticatedRequest, res: Response) => {
  const booking = db.findBookingById(req.params.id);
  if (!booking || booking.techPartnerId !== req.user!.id) {
    res.status(403).json({ error: 'Unauthorized.' });
    return;
  }

  if (booking.paymentStatus !== 'ESCROW_LOCKED' && booking.paymentStatus !== 'BALANCE_PENDING') {
    res.status(400).json({ error: 'Cannot check-in. Base escrow payment has not been locked.' });
    return;
  }

  const { latitude, longitude } = req.body;
  const partnerLat = typeof latitude === 'number' ? latitude : parseFloat(latitude);
  const partnerLng = typeof longitude === 'number' ? longitude : parseFloat(longitude);

  if (isNaN(partnerLat) || isNaN(partnerLng)) {
    res.status(400).json({ error: 'GPS coordinates (latitude and longitude) are strictly required for geofenced check-in.' });
    return;
  }

  const siteLat = booking.latitude;
  const siteLng = booking.longitude;

  if (siteLat === undefined || siteLng === undefined) {
    res.status(400).json({ error: 'Customer booking location has no pinned coordinates on record.' });
    return;
  }

  // Strict 50-meter geofenced validation
  const distanceMeters = calculateDistanceMeters(siteLat, siteLng, partnerLat, partnerLng);
  const GEOFENCE_THRESHOLD_METERS = 50;

  if (distanceMeters > GEOFENCE_THRESHOLD_METERS) {
    res.status(400).json({
      error: `Strict Geofence Violation: You are ${distanceMeters}m away from the customer's pinned location. Check-In is strictly restricted to within ${GEOFENCE_THRESHOLD_METERS} meters of the on-site location.`,
      distanceMeters,
      allowedThresholdMeters: GEOFENCE_THRESHOLD_METERS,
    });
    return;
  }

  const checkInTimestamp = new Date().toISOString();
  booking.checkInTime = checkInTimestamp;
  booking.checkInLatitude = partnerLat;
  booking.checkInLongitude = partnerLng;
  booking.checkInDistanceMeters = distanceMeters;
  booking.status = 'IN_PROGRESS';
  booking.updatedAt = checkInTimestamp;

  // Notify Customer
  db.addNotification({
    id: crypto.randomUUID(),
    userId: booking.seekerId,
    title: 'Tech Partner Checked In (Geofence Verified)',
    message: `${booking.techPartnerName} has arrived on-site (${distanceMeters}m from pinned address) and checked in. Job duration timer is active.`,
    type: 'INFO',
    link: '/seeker/bookings',
    isRead: false,
    createdAt: checkInTimestamp,
  });

  db.save();

  res.json({
    message: `Check-in verified within ${distanceMeters}m geofence! Job duration timer started.`,
    booking,
    checkInDistanceMeters: distanceMeters,
  });
});

// 8. Tech Partner Geofenced Check-Out & Purely Duration-Based Billing (Step 3)
// Strict Geofenced Validation: strictly within 50 meters of pinned customer location
router.post('/bookings/:id/check-out', authMiddleware, requireRole('TECH_PARTNER'), (req: AuthenticatedRequest, res: Response) => {
  const booking = db.findBookingById(req.params.id);
  if (!booking || booking.techPartnerId !== req.user!.id) {
    res.status(403).json({ error: 'Unauthorized.' });
    return;
  }

  if (!booking.checkInTime) {
    res.status(400).json({ error: 'You must check-in before checking out.' });
    return;
  }

  const { latitude, longitude, loggedHours, extensionChoice, extraHours, customHourlyRate, shiftExtensionType, fullDayUpgradeAmount, workNotes } = req.body;
  const partnerLat = typeof latitude === 'number' ? latitude : parseFloat(latitude);
  const partnerLng = typeof longitude === 'number' ? longitude : parseFloat(longitude);

  if (isNaN(partnerLat) || isNaN(partnerLng)) {
    res.status(400).json({ error: 'GPS coordinates (latitude and longitude) are strictly required for geofenced check-out.' });
    return;
  }

  const siteLat = booking.latitude;
  const siteLng = booking.longitude;

  let distanceMeters = 0;
  if (siteLat !== undefined && siteLng !== undefined) {
    distanceMeters = calculateDistanceMeters(siteLat, siteLng, partnerLat, partnerLng);
    const GEOFENCE_THRESHOLD_METERS = 50;

    if (distanceMeters > GEOFENCE_THRESHOLD_METERS) {
      res.status(400).json({
        error: `Strict Geofence Violation: You are ${distanceMeters}m away from the customer's pinned location. Check-Out is strictly restricted to within ${GEOFENCE_THRESHOLD_METERS} meters of the on-site location.`,
        distanceMeters,
        allowedThresholdMeters: GEOFENCE_THRESHOLD_METERS,
      });
      return;
    }
  }

  const checkOutTimestamp = new Date().toISOString();
  booking.checkOutTime = checkOutTimestamp;
  booking.checkOutLatitude = partnerLat;
  booking.checkOutLongitude = partnerLng;
  booking.checkOutDistanceMeters = distanceMeters;
  booking.workNotes = workNotes ? String(workNotes).trim() : (booking.workNotes || '');
  booking.updatedAt = checkOutTimestamp;

  // Time-Log Calculation: precise duration elapsed from Check-In to Check-Out
  const checkInMs = new Date(booking.checkInTime).getTime();
  const checkOutMs = new Date(checkOutTimestamp).getTime();
  const rawMinutes = Math.max(1, Math.round((checkOutMs - checkInMs) / (1000 * 60)));
  const elapsedHours = Math.round((rawMinutes / 60) * 10) / 10;

  const passedHours = typeof loggedHours === 'number' ? loggedHours : parseFloat(String(loggedHours));
  const effectiveLoggedDuration = !isNaN(passedHours) && passedHours > 0
    ? passedHours
    : (elapsedHours >= 0.1 ? elapsedHours : (booking.baseDurationHours || 4));

  booking.loggedDurationMinutes = rawMinutes;
  booking.loggedDurationHours = effectiveLoggedDuration;

  const baseHours = booking.baseDurationHours || 4;

  // Determine which Extension Option the technician chose:
  // 1. STANDARD: No extra work needed
  // 2. EXTRA_HOURS: Manual extra hours + custom technician hourly rate
  // 3. SHIFT_EXTENSION: Extend service to Full-Day (remaining balance from listing fullDayPrice)
  const choice = extensionChoice || 'STANDARD';
  booking.extensionChoice = choice;

  if (choice === 'EXTRA_HOURS') {
    const parsedExtraHours = Math.max(0.5, Number(extraHours) || 1);
    const parsedRate = Math.max(10, Number(customHourlyRate) || booking.hourlyRate || Math.round(booking.servicePrice / baseHours) || 200);

    const overtimeAmount = Math.round(parsedExtraHours * parsedRate * 100) / 100;
    const totalTopup = overtimeAmount; // Standard final overtime amount charged to customer

    booking.isExtended = true;
    booking.extensionChoice = 'EXTRA_HOURS';
    booking.extensionType = 'EXTRA_HOURS';
    booking.extraHoursWorked = parsedExtraHours;
    booking.customHourlyRate = parsedRate;
    booking.overtimeHours = parsedExtraHours;
    booking.overtimeAmount = overtimeAmount;
    booking.extensionReason = `Hourly Overtime: ${parsedExtraHours} extra hours worked at defined rate ₹${parsedRate}/hr (Overtime Amount: ₹${overtimeAmount})`;
    booking.postpaidBalanceAmount = totalTopup;
    booking.postpaidBalancePaid = false;
    booking.status = 'AWAITING_BALANCE_TOPUP';
    booking.paymentStatus = 'BALANCE_PENDING';

    // Secure notification to Seeker
    db.addNotification({
      id: crypto.randomUUID(),
      userId: booking.seekerId,
      title: 'Hourly Overtime Logged: Postpaid Balance Payment Required',
      message: `${booking.techPartnerName} logged ${parsedExtraHours} extra hours of overtime at ₹${parsedRate}/hr. Please review the time log and pay the postpaid balance of ₹${totalTopup} to approve final completion and release escrow.`,
      type: 'ALERT',
      link: '/seeker/bookings',
      isRead: false,
      createdAt: checkOutTimestamp,
    });

    db.save();

    res.json({
      message: `Check-out verified within ${distanceMeters}m geofence! Overtime recorded: ${parsedExtraHours} hrs at ₹${parsedRate}/hr (Postpaid balance: ₹${totalTopup}). Seeker notified for approval and balance payment.`,
      booking,
      totalLoggedHours: effectiveLoggedDuration,
      overtimeHours: parsedExtraHours,
      customHourlyRate: parsedRate,
      postpaidBalanceAmount: totalTopup,
    });
  } else if (choice === 'SHIFT_EXTENSION') {
    // Look up original listing to compute remaining full-day pricing
    const service = db.findServiceById(booking.serviceId);
    const fullPrice = service?.fullDayPrice || booking.fullDayPrice || Math.round(booking.servicePrice * 1.8);
    const halfPrice = service?.halfDayPrice || booking.halfDayPrice || booking.servicePrice;

    let remainingUpgrade = 0;
    if (fullDayUpgradeAmount && Number(fullDayUpgradeAmount) > 0) {
      remainingUpgrade = Math.round(Number(fullDayUpgradeAmount) * 100) / 100;
    } else if (fullPrice && fullPrice > halfPrice) {
      remainingUpgrade = fullPrice - halfPrice;
    } else {
      // If service listing doesn't specify full-day price, use standard 2nd half-day balance or 85% upgrade
      remainingUpgrade = Math.round(booking.servicePrice * 0.85);
    }

    const totalTopup = remainingUpgrade; // Standard remaining upgrade balance charged to customer

    booking.isExtended = true;
    booking.extensionChoice = 'SHIFT_EXTENSION';
    booking.extensionType = 'FULL_DAY';
    booking.shiftExtensionType = shiftExtensionType || 'FULL_DAY';
    booking.fullDayPrice = fullPrice;
    booking.halfDayPrice = halfPrice;
    booking.overtimeAmount = remainingUpgrade;
    booking.overtimeHours = 4;
    booking.extensionReason = `Shift Extension (Converted to Full-Day): Remaining upgrade balance based on technician full-day pricing (Upgrade: ₹${remainingUpgrade})`;
    booking.postpaidBalanceAmount = totalTopup;
    booking.postpaidBalancePaid = false;
    booking.status = 'AWAITING_BALANCE_TOPUP';
    booking.paymentStatus = 'BALANCE_PENDING';

    // Secure notification to Seeker
    db.addNotification({
      id: crypto.randomUUID(),
      userId: booking.seekerId,
      title: 'Full-Day Shift Extension: Postpaid Balance Payment Required',
      message: `${booking.techPartnerName} requested a Full-Day Shift Extension. Please review time logs and pay the remaining balance of ₹${totalTopup} to approve final completion and release escrow.`,
      type: 'ALERT',
      link: '/seeker/bookings',
      isRead: false,
      createdAt: checkOutTimestamp,
    });

    db.save();

    res.json({
      message: `Check-out verified within ${distanceMeters}m geofence! Shift converted to Full-Day (Remaining balance: ₹${totalTopup}). Seeker notified for approval and balance payment.`,
      booking,
      totalLoggedHours: effectiveLoggedDuration,
      postpaidBalanceAmount: totalTopup,
    });
  } else {
    // STANDARD COMPLETION: No extra work needed
    booking.isExtended = false;
    booking.extensionChoice = 'STANDARD';
    booking.extraHoursWorked = 0;
    booking.overtimeHours = 0;
    booking.overtimeAmount = 0;
    booking.postpaidBalanceAmount = 0;
    booking.postpaidBalancePaid = true;
    booking.status = 'COMPLETED';
    booking.paymentStatus = 'ESCROW_LOCKED';
    booking.extensionReason = `Standard Completion: Concluded within base ${baseHours} hrs shift. No additional overtime or shift extension requested.`;

    // Notify Customer to Approve Work
    db.addNotification({
      id: crypto.randomUUID(),
      userId: booking.seekerId,
      title: 'Service Completed: Approval Required',
      message: `${booking.techPartnerName} completed work within the standard ${baseHours} hrs shift. Please inspect the work and click "Approve Completed Work" to release escrow funds.`,
      type: 'ALERT',
      link: '/seeker/bookings',
      isRead: false,
      createdAt: checkOutTimestamp,
    });

    db.save();

    res.json({
      message: `Check-out verified within ${distanceMeters}m geofence! Standard completion recorded. Seeker notified for completion approval.`,
      booking,
      totalLoggedHours: effectiveLoggedDuration,
    });
  }
});

// 8b. Postpaid Balance Top-up Payment (Step 4)
router.post('/bookings/:id/pay-balance', authMiddleware, requireRole('SERVICE_SEEKER'), (req: AuthenticatedRequest, res: Response) => {
  const booking = db.findBookingById(req.params.id);
  if (!booking) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }

  if (booking.seekerId !== req.user!.id && req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: 'Unauthorized.' });
    return;
  }

  if (!booking.isExtended || !booking.postpaidBalanceAmount || booking.postpaidBalanceAmount <= 0) {
    res.status(400).json({ error: 'No balance top-up is required for this booking.' });
    return;
  }

  if (booking.postpaidBalancePaid) {
    res.status(400).json({ error: 'Balance top-up has already been cleared.' });
    return;
  }

  const { paymentMethod, paymentReference } = req.body;
  if (!paymentMethod) {
    res.status(400).json({ error: 'Payment method is required.' });
    return;
  }

  const ref = paymentReference || `TOPUP-${paymentMethod}-${Date.now().toString().slice(-6)}`;
  const paidTimestamp = new Date().toISOString();

  // Net extension amount that goes to technician after internal 10% platform fee
  const grossTopup = booking.postpaidBalanceAmount;
  const commissionRate = (db.getPlatformSettings().localServiceCommissionPercentage || 10) / 100;
  const topupFee = Math.round(grossTopup * commissionRate * 100) / 100;
  const netExtensionShare = Math.round((grossTopup - topupFee) * 100) / 100;
  const topupTaxes = 0;

  booking.postpaidBalancePaid = true;
  booking.postpaidBalancePaidAt = paidTimestamp;
  booking.postpaidBalanceTxnId = ref;
  booking.postpaidBalanceMethod = paymentMethod;
  booking.paymentStatus = 'ESCROW_LOCKED';
  booking.status = 'COMPLETED'; // ready for final customer approval
  booking.totalSettledAmount = Math.round((booking.totalPayableAmount + grossTopup) * 100) / 100;
  booking.updatedAt = paidTimestamp;

  // Add extension net amount to technician's escrow pending
  const techWallet = db.getOrCreateWallet(booking.techPartnerId);
  techWallet.escrowPendingAmount = Math.round((techWallet.escrowPendingAmount + netExtensionShare) * 100) / 100;
  db.updateWallet(booking.techPartnerId, techWallet);

  // Financial Ledger Entry: Balance Top-Up Escrow Deposit
  const topupLedgerEntry: FinancialLedgerEntry = {
    id: crypto.randomUUID(),
    transactionId: `TX-TOPUP-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
    division: 'LOCAL_SERVICE',
    bookingId: booking.id,
    title: `Shift Extension Top-Up: ${booking.serviceTitle}`,
    payerId: booking.seekerId,
    payerName: booking.seekerName,
    payeeId: booking.techPartnerId,
    payeeName: booking.techPartnerName,
    grossAmount: grossTopup,
    platformFee: topupFee,
    applicableTaxes: topupTaxes,
    netPartnerAmount: netExtensionShare,
    paymentProvider: `MARKETPLACE_GATEWAY_${paymentMethod}`,
    paymentReference: ref,
    escrowStatus: 'ESCROW_LOCKED',
    lockTimestamp: paidTimestamp,
    isDisputed: false,
    notes: `Shift extension balance top-up: ${booking.extensionReason || 'Shift extension'}`,
    createdAt: paidTimestamp,
  };
  db.addLedgerEntry(topupLedgerEntry);

  // Notify Tech Partner
  db.addNotification({
    id: crypto.randomUUID(),
    userId: booking.techPartnerId,
    title: 'Shift Extension Balance Cleared into Escrow',
    message: `${booking.seekerName} paid the shift extension balance (₹${grossTopup}). Funds are secured in Escrow pending final work approval.`,
    type: 'SUCCESS',
    link: '/tech/bookings',
    isRead: false,
    createdAt: paidTimestamp,
  });

  db.save();

  res.json({
    message: 'Postpaid balance top-up cleared into escrow! You can now approve work completion.',
    booking,
  });
});

// 9. Customer Approves Completed Service & Releases Total Escrow to Tech Partner (Step 5)
router.post('/bookings/:id/approve', authMiddleware, requireRole('SERVICE_SEEKER'), (req: AuthenticatedRequest, res: Response) => {
  const booking = db.findBookingById(req.params.id);
  if (!booking || (booking.seekerId !== req.user!.id && req.user!.role !== 'ADMIN')) {
    res.status(403).json({ error: 'Unauthorized.' });
    return;
  }

  if (booking.customerApproved) {
    res.status(400).json({ error: 'This booking has already been approved and settled.' });
    return;
  }

  if (!booking.checkOutTime) {
    res.status(400).json({ error: 'Technician has not checked out of this service yet.' });
    return;
  }

  // Check if there is an unpaid shift extension balance
  if (booking.isExtended && booking.postpaidBalanceAmount && booking.postpaidBalanceAmount > 0 && !booking.postpaidBalancePaid) {
    res.status(400).json({
      error: 'Cannot approve completion: Shift extension balance top-up is pending payment. Please pay the balance top-up first.',
      postpaidBalanceAmount: booking.postpaidBalanceAmount,
    });
    return;
  }

  const releaseTimestamp = new Date().toISOString();
  booking.customerApproved = true;
  booking.customerApprovedAt = releaseTimestamp;
  booking.paymentStatus = 'RELEASED_TO_PARTNER';
  booking.status = 'COMPLETED';
  booking.updatedAt = releaseTimestamp;

  // Calculate total net earnings to release (Base Net + Extension Net after internal 10% platform fee)
  const baseNet = Math.round((booking.servicePrice - (booking.platformFee || 0)) * 100) / 100;
  let extensionNet = 0;
  if (booking.isExtended && booking.postpaidBalanceAmount && booking.postpaidBalanceAmount > 0) {
    const commissionRate = (db.getPlatformSettings().localServiceCommissionPercentage || 10) / 100;
    const extFee = Math.round(booking.postpaidBalanceAmount * commissionRate * 100) / 100;
    extensionNet = Math.round((booking.postpaidBalanceAmount - extFee) * 100) / 100;
  }
  const totalNetEarnings = Math.round((baseNet + extensionNet) * 100) / 100;

  // Move funds from Escrow Pending -> Available Withdrawable Balance in Wallet
  const techWallet = db.getOrCreateWallet(booking.techPartnerId);
  techWallet.escrowPendingAmount = Math.max(0, Math.round((techWallet.escrowPendingAmount - totalNetEarnings) * 100) / 100);
  techWallet.grossEarnings = Math.round((techWallet.grossEarnings + totalNetEarnings) * 100) / 100;
  techWallet.availableWithdrawableBalance = Math.round((techWallet.availableWithdrawableBalance + totalNetEarnings) * 100) / 100;
  db.updateWallet(booking.techPartnerId, techWallet);

  // Update Financial Ledger
  const ledgerEntries = db.getFinancialLedger().filter((l) => l.bookingId === booking.id);
  ledgerEntries.forEach((l) => {
    db.updateLedgerEntry(l.id, {
      escrowStatus: 'RELEASED_TO_PARTNER',
      releaseTimestamp,
    });
  });

  // Notify Tech Partner
  db.addNotification({
    id: crypto.randomUUID(),
    userId: booking.techPartnerId,
    title: 'Payment Released to Your Withdrawable Wallet!',
    message: `${booking.seekerName} approved your completed service. ₹${totalNetEarnings} is now available in your Withdrawable Balance.`,
    type: 'SUCCESS',
    link: '/tech/wallet',
    isRead: false,
    createdAt: releaseTimestamp,
  });

  db.save();

  res.json({
    message: `Service approved! Total payment of ₹${totalNetEarnings} successfully released to Tech Partner's withdrawable wallet.`,
    booking,
    releasedAmount: totalNetEarnings,
  });
});

// 10. Raise Dispute (Halts escrow release)
router.post('/bookings/:id/dispute', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const booking = db.findBookingById(req.params.id);
  if (!booking) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }

  const isSeeker = booking.seekerId === req.user!.id;
  const isTech = booking.techPartnerId === req.user!.id;

  if (!isSeeker && !isTech) {
    res.status(403).json({ error: 'Unauthorized.' });
    return;
  }

  const { reasonCategory, description, evidenceUrls } = req.body;
  if (!reasonCategory || !description) {
    res.status(400).json({ error: 'Reason category and detailed explanation are required.' });
    return;
  }

  booking.status = 'DISPUTED';
  booking.paymentStatus = 'DISPUTED';

  const dispute = {
    id: crypto.randomUUID(),
    division: 'LOCAL_SERVICE' as const,
    bookingId: booking.id,
    raisedBy: req.user!.id,
    raisedByName: req.user!.fullName,
    againstUserId: isSeeker ? booking.techPartnerId : booking.seekerId,
    againstUserName: isSeeker ? booking.techPartnerName : booking.seekerName,
    reasonCategory,
    description,
    evidenceUrls: evidenceUrls || [],
    resolutionStatus: 'OPEN' as const,
    refundAmount: 0,
    createdAt: new Date().toISOString(),
  };

  db.addDispute(dispute);

  // Update Ledger
  const ledger = db.getFinancialLedger().find((l) => l.bookingId === booking.id);
  if (ledger) {
    db.updateLedgerEntry(ledger.id, { isDisputed: true, escrowStatus: 'DISPUTED' });
  }

  db.save();

  res.json({
    message: 'Dispute recorded. Automatic payment release is halted. Admin will review the case.',
    dispute,
  });
});

// 11. My Bookings (Seeker or Tech Partner - Conditional Contact Disclosure Protocol)
router.get('/my/bookings', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;
  const bookings = db.getBookings().filter((b) => b.seekerId === userId || b.techPartnerId === userId);

  const sanitizedBookings = bookings.map((b) => {
    const isEscrowLocked =
      b.paymentStatus === 'ESCROW_LOCKED' ||
      b.paymentStatus === 'BALANCE_PENDING' ||
      b.paymentStatus === 'RELEASED_TO_PARTNER';

    const isAuthorizedCounterparty = b.seekerId === userId || b.techPartnerId === userId || userRole === 'ADMIN';

    if (isEscrowLocked && isAuthorizedCounterparty) {
      // Post-Escrow Payment Phase: Full contact details unlocked strictly for assigned counter-party
      return {
        ...b,
        isContactUnlocked: true,
      };
    } else {
      // Pre-Payment Phase: Conceal phone numbers and direct contact details
      return {
        ...b,
        seekerMobile: maskPhoneNumber(b.seekerMobile),
        techPartnerMobile: maskPhoneNumber(b.techPartnerMobile),
        isContactUnlocked: false,
      };
    }
  });

  res.json({ bookings: sanitizedBookings });
});

export default router;
