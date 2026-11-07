import { Router } from 'express';
import type { Response } from 'express';
import crypto from 'crypto';
import { db } from '../db.ts';
import { authMiddleware, requireRole } from '../middleware.ts';
import type { AuthenticatedRequest } from '../middleware.ts';
import { calculateDistanceKm, isWithinGeofence } from '../geo.ts';
import type { Gig, GigApplication, GigAttendance, FinancialLedgerEntry } from '../types.ts';
import { validatePrivacyText, maskPhoneNumber, maskEmail } from '../privacyFilter.ts';

const router = Router();

// 1. Browse Gigs (10 to 15 km Radius Search & Filters)
router.get('/', (req, res: Response) => {
  const {
    category,
    search,
    userLat,
    userLng,
    radiusKm = '10',
    minPayment,
    isFlexiStaff,
  } = req.query;

  let gigs = db.getGigs().filter((g) => g.status === 'PUBLISHED' || g.status === 'FILLED');

  if (category && category !== 'All') {
    gigs = gigs.filter((g) => g.category.toLowerCase() === String(category).toLowerCase());
  }

  if (isFlexiStaff === 'true') {
    gigs = gigs.filter((g) => g.isFlexiStaff);
  }

  if (minPayment) {
    gigs = gigs.filter((g) => g.paymentAmount >= Number(minPayment));
  }

  if (search) {
    const q = String(search).toLowerCase();
    gigs = gigs.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.workLocation.toLowerCase().includes(q) ||
        (g.fullAddress && g.fullAddress.toLowerCase().includes(q)) ||
        g.category.toLowerCase().includes(q) ||
        (g.hostName && g.hostName.toLowerCase().includes(q)) ||
        (g.requiredSkills && g.requiredSkills.toLowerCase().includes(q))
    );
  }

  // Geospatial Distance Calculation & Configurable Radius Filter
  if (userLat !== undefined && userLng !== undefined && String(userLat).trim() !== '' && String(userLng).trim() !== '') {
    const lat = parseFloat(String(userLat));
    const lng = parseFloat(String(userLng));
    const radiusStr = String(radiusKm || '').toLowerCase();

    if (!isNaN(lat) && !isNaN(lng)) {
      gigs = gigs.map((gig) => {
        const distance = calculateDistanceKm(lat, lng, gig.latitude, gig.longitude);
        return { ...gig, distanceKm: distance };
      });

      // Filter by radius strictly enforcing 10 to 15 km operational limit (unless global)
      if (radiusStr !== 'all' && radiusStr !== 'any' && radiusStr !== 'global' && radiusStr !== '') {
        const parsedRadius = parseFloat(radiusStr);
        const maxRadius = isNaN(parsedRadius) ? 10 : Math.min(15, Math.max(5, parsedRadius));
        gigs = gigs.filter((g) => g.distanceKm !== undefined && g.distanceKm <= maxRadius);
      }

      gigs.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    }
  }

  // Job Feed Sanitization: Strictly hide deducted platform brokerage fee from Gig Partners.
  // Display ONLY the net payout amount (Total budget minus platform fee) on job feed cards.
  const sanitizedGigs = gigs.map((gig) => {
    const calc = db.calculateGigBrokerage(
      gig.paymentAmount,
      gig.requiredWorkers,
      gig.isFlexiStaff,
      gig.flexiStaffFeePercentage
    );
    const netPayout = gig.netPayoutAmount !== undefined ? gig.netPayoutAmount : calc.netPayoutAmount;
    return {
      ...gig,
      // Partners see only the net payout amount as their compensation
      paymentAmount: netPayout,
      netPayoutAmount: netPayout,
      // Platform brokerage fees strictly hidden from partner view
      platformFee: undefined,
      platformCommission: undefined,
      platformBrokerageRate: undefined,
      totalEscrowAmount: undefined,
    };
  });

  res.json({ gigs: sanitizedGigs });
});

// 2. Get Host's Own Gigs
router.get('/my', authMiddleware, requireRole('GIG_HOST'), (req: AuthenticatedRequest, res: Response) => {
  const hostId = req.user!.id;
  const rawGigs = db.getGigs().filter((g) => g.hostId === hostId);
  const gigs = rawGigs.map((g) => {
    const apps = db.getGigApplications(g.id);
    const confirmed = apps.filter((a) => a.status === 'APPROVED');
    const attendance = db.getGigAttendance(g.id);
    const hasActiveAttendance = attendance.some(
      (att) => att.status === 'CHECKED_IN' || att.status === 'CHECKED_OUT' || att.hostApproved
    );
    const isLocked =
      g.status === 'IN_PROGRESS' ||
      g.status === 'COMPLETED' ||
      (g.confirmedWorkers || 0) > 0 ||
      confirmed.length > 0 ||
      hasActiveAttendance;

    return {
      ...g,
      confirmedWorkersCount: confirmed.length,
      applicationsCount: apps.length,
      isLocked,
      lockReason: isLocked
        ? 'Locked to prevent rate manipulation while shift is active or workers are confirmed.'
        : undefined,
    };
  });
  res.json({ gigs });
});

// 2b. Update Gig Listing (Task descriptions, timing, required workers headcount, base payout)
const handleUpdateGig = (req: AuthenticatedRequest, res: Response) => {
  const host = req.user!;
  const gigId = req.params.id;
  const gig = db.findGigById(gigId);

  if (!gig) {
    res.status(404).json({ error: 'Gig not found.' });
    return;
  }

  if (gig.hostId !== host.id && host.role !== 'ADMIN') {
    res.status(403).json({ error: 'Access denied: You are only authorized to edit your own posted gigs.' });
    return;
  }

  // Security & Misuse Prevention:
  // Lock editing capabilities once a gig is in an "Active Escrow / In-Progress Booking" state
  const applications = db.getGigApplications(gig.id);
  const confirmedApps = applications.filter((a) => a.status === 'APPROVED');
  const attendanceList = db.getGigAttendance(gig.id);
  const hasActiveAttendance = attendanceList.some(
    (att) => att.status === 'CHECKED_IN' || att.status === 'CHECKED_OUT' || att.hostApproved
  );
  const isLocked =
    gig.status === 'IN_PROGRESS' ||
    gig.status === 'COMPLETED' ||
    (gig.confirmedWorkers || 0) > 0 ||
    confirmedApps.length > 0 ||
    hasActiveAttendance;

  if (isLocked) {
    res.status(400).json({
      error:
        'Editing Locked: This gig is currently in-progress or has active confirmed workers with escrow commitments. To prevent post-booking rate manipulation, terms cannot be altered while active.',
    });
    return;
  }

  const {
    title,
    description,
    category,
    customCategory,
    employmentType,
    requiredSkills,
    requiredWorkers,
    workDate,
    shiftStartTime,
    shiftEndTime,
    customDuration,
    paymentAmount,
    paymentBasis,
    requiredExperience,
    workLocation,
    fullAddress,
    latitude,
    longitude,
    additionalInstructions,
    applicationDeadline,
    isFlexiStaff,
    flexiStaffDurationMonths,
    flexiStaffFeePercentage,
    termsAndConditions,
    status,
  } = req.body;

  // Privacy restriction filter checks
  if (description) {
    const checkDesc = validatePrivacyText(description);
    if (checkDesc.hasViolation) {
      res.status(400).json({ error: `Privacy Violation in Description: ${checkDesc.reason}` });
      return;
    }
  }
  if (workLocation) {
    const checkLoc = validatePrivacyText(workLocation);
    if (checkLoc.hasViolation) {
      res.status(400).json({ error: `Privacy Violation in Location: ${checkLoc.reason}` });
      return;
    }
  }
  if (fullAddress) {
    const checkAddr = validatePrivacyText(fullAddress);
    if (checkAddr.hasViolation) {
      res.status(400).json({ error: `Privacy Violation in Address: ${checkAddr.reason}` });
      return;
    }
  }
  if (additionalInstructions) {
    const checkInst = validatePrivacyText(additionalInstructions);
    if (checkInst.hasViolation) {
      res.status(400).json({ error: `Privacy Violation in Instructions: ${checkInst.reason}` });
      return;
    }
  }

  const updates: Partial<Gig> = {};

  if (title !== undefined && String(title).trim()) updates.title = String(title).trim();
  if (description !== undefined && String(description).trim()) updates.description = String(description).trim();
  if (category !== undefined && String(category).trim()) {
    updates.category = String(category).trim();
    if (updates.category === 'Others' && customCategory) {
      updates.customCategory = String(customCategory).trim();
    }
  }
  if (customCategory !== undefined) updates.customCategory = String(customCategory).trim();
  if (employmentType !== undefined) updates.employmentType = String(employmentType).trim();
  if (requiredSkills !== undefined) updates.requiredSkills = String(requiredSkills).trim();
  if (requiredExperience !== undefined) updates.requiredExperience = String(requiredExperience).trim();
  if (workDate !== undefined) updates.workDate = String(workDate).trim();
  if (shiftStartTime !== undefined) updates.shiftStartTime = String(shiftStartTime).trim();
  if (shiftEndTime !== undefined) updates.shiftEndTime = String(shiftEndTime).trim();
  if (customDuration !== undefined) updates.customDuration = String(customDuration).trim();
  if (paymentBasis !== undefined) updates.paymentBasis = String(paymentBasis).trim();
  if (workLocation !== undefined) updates.workLocation = String(workLocation).trim();
  if (fullAddress !== undefined) updates.fullAddress = String(fullAddress).trim();
  if (additionalInstructions !== undefined) updates.additionalInstructions = String(additionalInstructions).trim();
  if (applicationDeadline !== undefined) updates.applicationDeadline = String(applicationDeadline).trim();
  if (termsAndConditions !== undefined) updates.termsAndConditions = String(termsAndConditions).trim();

  if (latitude !== undefined && latitude !== null && !isNaN(parseFloat(latitude))) {
    updates.latitude = parseFloat(latitude);
  }
  if (longitude !== undefined && longitude !== null && !isNaN(parseFloat(longitude))) {
    updates.longitude = parseFloat(longitude);
  }

  if (requiredWorkers !== undefined) {
    const rw = parseInt(String(requiredWorkers), 10);
    if (!isNaN(rw) && rw > 0) {
      updates.requiredWorkers = rw;
    }
  }

  if (paymentAmount !== undefined) {
    const pa = parseFloat(String(paymentAmount));
    if (!isNaN(pa) && pa > 0) {
      updates.paymentAmount = pa;
    }
  }

  if (isFlexiStaff !== undefined) {
    updates.isFlexiStaff = Boolean(isFlexiStaff);
  }
  if (flexiStaffDurationMonths !== undefined) {
    updates.flexiStaffDurationMonths = parseFloat(String(flexiStaffDurationMonths)) || 1;
  }
  if (flexiStaffFeePercentage !== undefined) {
    updates.flexiStaffFeePercentage = parseFloat(String(flexiStaffFeePercentage)) || 7.5;
  }

  if (status !== undefined && (status === 'DRAFT' || status === 'PUBLISHED')) {
    updates.status = status;
  }

  // Recalculate dynamic brokerage tiers and escrow estimate
  const finalAmount = updates.paymentAmount !== undefined ? updates.paymentAmount : gig.paymentAmount;
  const finalWorkers = updates.requiredWorkers !== undefined ? updates.requiredWorkers : gig.requiredWorkers;
  const isFlexi = updates.isFlexiStaff !== undefined ? updates.isFlexiStaff : gig.isFlexiStaff;
  const flexiFee = updates.flexiStaffFeePercentage !== undefined ? updates.flexiStaffFeePercentage : gig.flexiStaffFeePercentage;

  const calc = db.calculateGigBrokerage(finalAmount, finalWorkers, isFlexi, flexiFee);
  updates.platformFee = calc.platformFee;
  updates.platformCommission = calc.platformFee;
  updates.platformBrokerageRate = calc.tierRate;
  updates.netPayoutAmount = calc.netPayoutAmount;
  updates.totalEscrowAmount = calc.grossBudget;

  const updatedGig = db.updateGig(gig.id, updates);
  if (!updatedGig) {
    res.status(500).json({ error: 'Failed to update gig in database.' });
    return;
  }

  res.json({
    message: 'Gig listing updated successfully.',
    gig: updatedGig,
  });
};

router.patch('/:id', authMiddleware, requireRole('GIG_HOST'), handleUpdateGig);
router.put('/:id', authMiddleware, requireRole('GIG_HOST'), handleUpdateGig);

// 3. Post New Gig (Form starts completely blank)
router.post('/', authMiddleware, requireRole('GIG_HOST'), (req: AuthenticatedRequest, res: Response) => {
  const host = req.user!;
  const {
    title,
    description,
    category,
    customCategory,
    employmentType,
    requiredSkills,
    requiredWorkers,
    workDate,
    shiftStartTime,
    shiftEndTime,
    customDuration,
    paymentAmount,
    paymentBasis,
    requiredExperience,
    workLocation,
    fullAddress,
    latitude,
    longitude,
    additionalInstructions,
    applicationDeadline,
    isFlexiStaff,
    flexiStaffDurationMonths,
    flexiStaffFeePercentage,
    termsAndConditions,
  } = req.body;

  // Privacy restriction filter checks
  const checkDesc = validatePrivacyText(description);
  if (checkDesc.hasViolation) {
    res.status(400).json({ error: `Privacy Violation in Description: ${checkDesc.reason}` });
    return;
  }
  const checkLoc = validatePrivacyText(workLocation);
  if (checkLoc.hasViolation) {
    res.status(400).json({ error: `Privacy Violation in Location: ${checkLoc.reason}` });
    return;
  }
  const checkAddr = validatePrivacyText(fullAddress);
  if (checkAddr.hasViolation) {
    res.status(400).json({ error: `Privacy Violation in Address: ${checkAddr.reason}` });
    return;
  }
  if (additionalInstructions) {
    const checkInst = validatePrivacyText(additionalInstructions);
    if (checkInst.hasViolation) {
      res.status(400).json({ error: `Privacy Violation in Instructions: ${checkInst.reason}` });
      return;
    }
  }

  // Validation
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
    res.status(400).json({ error: 'All core gig details and location coordinates are required.' });
    return;
  }

  if (category === 'Others' && !customCategory) {
    res.status(400).json({ error: 'Please specify the custom category for Others.' });
    return;
  }

  const numWorkers = parseInt(requiredWorkers, 10);
  const amount = parseFloat(paymentAmount);

  if (numWorkers <= 0 || amount <= 0) {
    res.status(400).json({ error: 'Workers count and payment amount must be greater than zero.' });
    return;
  }

  // Calculate dynamic platform brokerage fee (1-5 members: default 10%, >5 members bulk: default 5%)
  // Fee is deducted directly from the Host's posted budget
  const brokerage = db.calculateGigBrokerage(
    amount,
    numWorkers,
    !!isFlexiStaff,
    isFlexiStaff ? parseFloat(flexiStaffFeePercentage) : undefined
  );

  const platformFee = brokerage.platformFee;
  const feePct = brokerage.tierRate;
  const grossWorkerPool = brokerage.grossBudget;
  const netPayoutAmount = brokerage.netPayoutAmount;
  const totalEscrowRequired = grossWorkerPool; // Host deposits their gross posted budget; fee is deducted from it

  const escrowTxnId = req.body.escrowReference || `ESC-DEP-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  const escrowMethod = req.body.escrowPaymentMethod || 'RAZORPAY_SIMULATED';

  const newGig: Gig = {
    id: crypto.randomUUID(),
    hostId: host.id,
    hostName: host.fullName,
    title: title.trim(),
    description: description.trim(),
    category: category.trim(),
    customCategory: customCategory?.trim(),
    employmentType: employmentType || 'Temporary Shift',
    requiredSkills: requiredSkills || '',
    requiredWorkers: numWorkers,
    confirmedWorkers: 0,
    workDate,
    shiftStartTime,
    shiftEndTime,
    customDuration: customDuration.trim(),
    paymentAmount: amount, // Host's posted unit budget
    paymentBasis: paymentBasis || 'Per Shift',
    requiredExperience: requiredExperience || '',
    workLocation: workLocation.trim(),
    fullAddress: fullAddress.trim(),
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    geofenceRadiusMeters: 200,
    additionalInstructions,
    applicationDeadline,
    isFlexiStaff: !!isFlexiStaff,
    flexiStaffDurationMonths: isFlexiStaff ? parseFloat(flexiStaffDurationMonths) || 1 : undefined,
    flexiStaffFeePercentage: isFlexiStaff ? feePct : undefined,
    platformFee,
    platformCommission: platformFee,
    platformBrokerageRate: feePct,
    netPayoutAmount,
    totalEscrowAmount: totalEscrowRequired,
    escrowStatus: 'ESCROW_LOCKED',
    escrowTransactionId: escrowTxnId,
    escrowPaymentMethod: escrowMethod,
    escrowPaidAt: new Date().toISOString(),
    termsAndConditions,
    status: 'PUBLISHED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.addGig(newGig);

  // Financial Ledger Entry: Host locks escrow funds in TaskHub Escrow Vault
  const escrowLedgerEntry: FinancialLedgerEntry = {
    id: crypto.randomUUID(),
    transactionId: escrowTxnId,
    division: 'MICRO_GIG',
    gigId: newGig.id,
    title: `Pre-Publish Escrow Deposit: ${newGig.title}`,
    payerId: host.id,
    payerName: host.fullName,
    payeeId: 'TASKHUB_ESCROW_VAULT',
    payeeName: 'TaskHub Platform Escrow Reserve',
    grossAmount: totalEscrowRequired,
    platformFee,
    applicableTaxes: 0,
    netPartnerAmount: grossWorkerPool,
    paymentProvider: escrowMethod,
    paymentReference: escrowTxnId,
    escrowStatus: 'ESCROW_LOCKED',
    lockTimestamp: new Date().toISOString(),
    isDisputed: false,
    notes: `Pre-funded escrow for ${numWorkers} slots at ₹${amount}/${newGig.paymentBasis} (${feePct}% platform commission)`,
    createdAt: new Date().toISOString(),
  };
  db.addLedgerEntry(escrowLedgerEntry);

  db.broadcast('GIG_PUBLISHED_ESCROW_FUNDED', newGig);
  db.broadcast('GIG_CREATED', newGig);

  res.status(201).json({
    message: 'Escrow payment processed. Gig published live to platform reserve.',
    gig: newGig,
    escrowTransactionId: escrowTxnId,
    totalEscrowAmount: totalEscrowRequired,
  });
});

// 4. Get Gig Details with Applications & Waiting List
router.get('/:id', (req, res: Response) => {
  const gig = db.findGigById(req.params.id);
  if (!gig) {
    res.status(404).json({ error: 'Gig not found.' });
    return;
  }

  const applications = db.getGigApplications(gig.id);
  const attendance = db.getGigAttendance(gig.id);
  const confirmed = applications.filter((a) => a.status === 'APPROVED');
  const waitlist = applications
    .filter((a) => a.isWaitlisted && a.status === 'WAITLISTED')
    .sort((a, b) => (a.waitlistPosition || 0) - (b.waitlistPosition || 0));

  // Strict contact privacy: Conceal phone numbers and emails on all pre-approval applicants
  const sanitizedApplications = applications.map((a) => {
    if (a.status === 'APPROVED') {
      return { ...a, isContactUnlocked: true };
    }
    return {
      ...a,
      partnerMobile: maskPhoneNumber(a.partnerMobile),
      partnerEmail: maskEmail(a.partnerEmail),
      isContactUnlocked: false,
    };
  });

  const sanitizedWaitlist = waitlist.map((w) => ({
    ...w,
    partnerMobile: maskPhoneNumber(w.partnerMobile),
    partnerEmail: maskEmail(w.partnerEmail),
    isContactUnlocked: false,
  }));

  let isHostOrAdmin = false;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    const session = db.findSession(token);
    if (session) {
      const user = db.findUserById(session.userId);
      if (user && (user.id === gig.hostId || user.role === 'ADMIN')) {
        isHostOrAdmin = true;
      }
    }
  }

  const calc = db.calculateGigBrokerage(
    gig.paymentAmount,
    gig.requiredWorkers,
    gig.isFlexiStaff,
    gig.flexiStaffFeePercentage
  );
  const netPayout = gig.netPayoutAmount !== undefined ? gig.netPayoutAmount : calc.netPayoutAmount;

  const returnGig = isHostOrAdmin
    ? { ...gig, netPayoutAmount: netPayout }
    : {
        ...gig,
        paymentAmount: netPayout,
        netPayoutAmount: netPayout,
        platformFee: undefined,
        platformCommission: undefined,
        platformBrokerageRate: undefined,
        totalEscrowAmount: undefined,
      };

  res.json({
    gig: returnGig,
    applications: sanitizedApplications,
    confirmedWorkersCount: confirmed.length,
    waitlistCount: waitlist.length,
    waitlist: sanitizedWaitlist,
    attendance,
  });
});

// 5. Book Slot Now (Instant Slot Reservation - Individual or Referral Gang)
router.post('/:id/book-slot', authMiddleware, requireRole('GIG_PARTNER'), (req: AuthenticatedRequest, res: Response) => {
  const gig = db.findGigById(req.params.id);
  if (!gig) {
    res.status(404).json({ error: 'Gig not found.' });
    return;
  }

  if (gig.status === 'COMPLETED' || gig.status === 'CANCELLED') {
    res.status(400).json({ error: 'This gig is no longer accepting slot bookings.' });
    return;
  }

  const partner = req.user!;
  if (gig.hostId === partner.id) {
    res.status(400).json({ error: 'You cannot book a slot on your own posted gig.' });
    return;
  }

  const existingApp = db.findApplication(gig.id, partner.id);
  if (existingApp && (existingApp.status === 'APPROVED' || existingApp.status === 'PENDING')) {
    res.status(400).json({ error: 'You already have an active slot reservation for this gig.' });
    return;
  }

  const {
    bookingType = 'INDIVIDUAL',
    gangName,
    gangCount = 1,
    gangMembers = [],
    designatedPayoutAccount,
    notes,
  } = req.body;

  const slotsNeeded = bookingType === 'REFERRAL_GANG' ? Math.max(1, parseInt(String(gangCount), 10) || 1) : 1;
  const currentConfirmed = gig.confirmedWorkers || 0;
  const availableSlots = Math.max(0, gig.requiredWorkers - currentConfirmed);

  if (availableSlots <= 0) {
    res.status(400).json({
      error: 'All slots for this gig have already been reserved. You can join the waiting list.',
      isFilled: true,
    });
    return;
  }

  if (slotsNeeded > availableSlots) {
    res.status(400).json({
      error: `Cannot book ${slotsNeeded} slots. Only ${availableSlots} open slot(s) remain available.`,
      availableSlots,
    });
    return;
  }

  const gangId = bookingType === 'REFERRAL_GANG' ? `GANG-${crypto.randomBytes(3).toString('hex').toUpperCase()}` : undefined;
  const calc = db.calculateGigBrokerage(
    gig.paymentAmount,
    gig.requiredWorkers,
    gig.isFlexiStaff,
    gig.flexiStaffFeePercentage
  );
  const unitNetPayout = gig.netPayoutAmount !== undefined ? gig.netPayoutAmount : calc.netPayoutAmount;
  const consolidatedPayout = Math.round(unitNetPayout * slotsNeeded * 100) / 100;

  // 1. Create Confirmed Application (Slot Reserved)
  const newApp: GigApplication = {
    id: crypto.randomUUID(),
    gigId: gig.id,
    partnerId: partner.id,
    partnerName: partner.fullName,
    partnerMobile: partner.mobile,
    partnerEmail: partner.email,
    bookingType,
    gangId,
    gangName: gangName?.trim() || (bookingType === 'REFERRAL_GANG' ? `${partner.fullName}'s Gang (${slotsNeeded} Friends)` : undefined),
    gangCount: slotsNeeded,
    gangMembers: Array.isArray(gangMembers) ? gangMembers : [],
    designatedPayoutAccount: designatedPayoutAccount || {
      upiId: partner.mobile ? `${partner.mobile}@upi` : undefined,
      accountHolder: partner.fullName,
    },
    status: 'APPROVED',
    isWaitlisted: false,
    appliedAt: new Date().toISOString(),
    reviewedAt: new Date().toISOString(),
    notes,
  };
  db.addGigApplication(newApp);

  // 2. Initialize Attendance Log Record
  const attendanceRecord: GigAttendance = {
    id: crypto.randomUUID(),
    gigId: gig.id,
    partnerId: partner.id,
    partnerName: partner.fullName,
    bookingType,
    gangId,
    gangName: newApp.gangName,
    gangCount: slotsNeeded,
    gangMembers: newApp.gangMembers,
    designatedPayoutAccount: newApp.designatedPayoutAccount,
    consolidatedPayoutAmount: consolidatedPayout,
    status: 'NOT_STARTED',
    hostApproved: false,
    escrowStatus: 'ESCROW_LOCKED',
    createdAt: new Date().toISOString(),
  };
  db.setGigAttendance(attendanceRecord);

  // 3. Update Gig Confirmed Workers & Filled Status
  gig.confirmedWorkers = currentConfirmed + slotsNeeded;
  if (gig.confirmedWorkers >= gig.requiredWorkers) {
    gig.status = 'FILLED';
  }
  db.save();

  // 4. Send Notifications
  db.addNotification({
    id: crypto.randomUUID(),
    userId: gig.hostId,
    title: bookingType === 'REFERRAL_GANG' ? 'Bulk Gang Slot Reserved!' : 'New Slot Reserved!',
    message: `${partner.fullName} reserved ${slotsNeeded} slot(s) for "${gig.title}"${bookingType === 'REFERRAL_GANG' ? ` as part of Gang "${newApp.gangName}"` : ''}. (${gig.confirmedWorkers}/${gig.requiredWorkers} slots filled).`,
    type: 'SUCCESS',
    link: `/host/gigs/${gig.id}`,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  db.addNotification({
    id: crypto.randomUUID(),
    userId: partner.id,
    title: 'Slot Reservation Confirmed!',
    message: `Your booking for "${gig.title}" (${slotsNeeded} slot${slotsNeeded > 1 ? 's' : ''}) is locked in escrow reserve. Report to site on ${gig.workDate} at ${gig.shiftStartTime}.`,
    type: 'SUCCESS',
    link: '/partner/dashboard',
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  db.broadcast('SLOT_BOOKED', {
    gigId: gig.id,
    confirmedWorkers: gig.confirmedWorkers,
    requiredWorkers: gig.requiredWorkers,
    isFilled: gig.confirmedWorkers >= gig.requiredWorkers,
    bookingType,
  });

  db.broadcast('GIG_ACCEPTED', {
    hostId: gig.hostId,
    gigId: gig.id,
    gigTitle: gig.title,
    partnerId: partner.id,
    partnerName: partner.fullName,
    slotsCount: slotsNeeded,
    bookingType,
    workDate: gig.workDate,
    shiftStartTime: gig.shiftStartTime,
    paymentAmount: gig.paymentAmount,
    workLocation: gig.workLocation,
    confirmedWorkers: gig.confirmedWorkers,
    requiredWorkers: gig.requiredWorkers,
    timestamp: Date.now(),
  });

  res.status(201).json({
    message: `Slot reserved successfully! You have secured ${slotsNeeded} position(s).`,
    gig,
    application: newApp,
    attendance: attendanceRecord,
  });
});

// 5b. Apply to Gig (Standard / Waiting List)
router.post('/:id/apply', authMiddleware, requireRole('GIG_PARTNER'), (req: AuthenticatedRequest, res: Response) => {
  const gig = db.findGigById(req.params.id);
  if (!gig) {
    res.status(404).json({ error: 'Gig not found.' });
    return;
  }

  if (gig.status === 'COMPLETED' || gig.status === 'CANCELLED') {
    res.status(400).json({ error: 'This gig is no longer accepting applications.' });
    return;
  }

  const partner = req.user!;
  const existing = db.findApplication(gig.id, partner.id);
  if (existing) {
    res.status(400).json({ error: 'You have already applied or booked a slot for this gig.' });
    return;
  }

  const confirmedCount = gig.confirmedWorkers || 0;
  const isFilled = confirmedCount >= gig.requiredWorkers;

  if (isFilled) {
    // Railway-Style Waiting List
    const existingWaitlist = db
      .getGigApplications(gig.id)
      .filter((a) => a.isWaitlisted && a.status === 'WAITLISTED');
    const queuePosition = existingWaitlist.length + 1;

    const newApp: GigApplication = {
      id: crypto.randomUUID(),
      gigId: gig.id,
      partnerId: partner.id,
      partnerName: partner.fullName,
      partnerMobile: partner.mobile,
      partnerEmail: partner.email,
      bookingType: 'INDIVIDUAL',
      status: 'WAITLISTED',
      isWaitlisted: true,
      waitlistPosition: queuePosition,
      appliedAt: new Date().toISOString(),
      notes: req.body.notes,
    };

    db.addGigApplication(newApp);

    db.addNotification({
      id: crypto.randomUUID(),
      userId: gig.hostId,
      title: 'New Waiting List Applicant',
      message: `${partner.fullName} joined the waiting list for "${gig.title}" at position #${queuePosition}.`,
      type: 'INFO',
      link: `/host/gigs/${gig.id}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({
      message: `All ${gig.requiredWorkers}/${gig.requiredWorkers} positions are filled. You have been placed on the waiting list at Queue Position #${queuePosition}.`,
      application: newApp,
    });
    return;
  }

  // If slots are open, auto-reserve via Book Slot
  const newApp: GigApplication = {
    id: crypto.randomUUID(),
    gigId: gig.id,
    partnerId: partner.id,
    partnerName: partner.fullName,
    partnerMobile: partner.mobile,
    partnerEmail: partner.email,
    bookingType: 'INDIVIDUAL',
    status: 'APPROVED',
    isWaitlisted: false,
    appliedAt: new Date().toISOString(),
    reviewedAt: new Date().toISOString(),
    notes: req.body.notes,
  };
  db.addGigApplication(newApp);

  const att: GigAttendance = {
    id: crypto.randomUUID(),
    gigId: gig.id,
    partnerId: partner.id,
    partnerName: partner.fullName,
    bookingType: 'INDIVIDUAL',
    status: 'NOT_STARTED',
    hostApproved: false,
    escrowStatus: 'ESCROW_LOCKED',
    createdAt: new Date().toISOString(),
  };
  db.setGigAttendance(att);

  gig.confirmedWorkers = (gig.confirmedWorkers || 0) + 1;
  if (gig.confirmedWorkers >= gig.requiredWorkers) {
    gig.status = 'FILLED';
  }
  db.save();

  db.addNotification({
    id: crypto.randomUUID(),
    userId: gig.hostId,
    title: 'New Slot Reserved',
    message: `${partner.fullName} booked a slot for "${gig.title}". (${gig.confirmedWorkers}/${gig.requiredWorkers} filled).`,
    type: 'SUCCESS',
    link: `/host/gigs/${gig.id}`,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  db.broadcast('GIG_ACCEPTED', {
    hostId: gig.hostId,
    gigId: gig.id,
    gigTitle: gig.title,
    partnerId: partner.id,
    partnerName: partner.fullName,
    slotsCount: 1,
    bookingType: 'INDIVIDUAL',
    workDate: gig.workDate,
    shiftStartTime: gig.shiftStartTime,
    paymentAmount: gig.paymentAmount,
    workLocation: gig.workLocation,
    confirmedWorkers: gig.confirmedWorkers,
    requiredWorkers: gig.requiredWorkers,
    timestamp: Date.now(),
  });

  res.status(201).json({
    message: 'Slot reserved successfully! You are confirmed for this gig.',
    application: newApp,
    attendance: att,
  });
});

// 5c. Get Partner's Active & Past Bookings (for "My Active Bookings" tab)
router.get('/partner/my-bookings', authMiddleware, requireRole('GIG_PARTNER'), (req: AuthenticatedRequest, res: Response) => {
  const partnerId = req.user!.id;
  const applications = db.getGigApplications().filter((a) => a.partnerId === partnerId);
  const attendances = db.getGigAttendance().filter((att) => att.partnerId === partnerId);
  const gigs = db.getGigs();
  const gigMap = new Map(gigs.map((g) => [g.id, g]));

  const bookings = applications.map((app) => {
    const gig = gigMap.get(app.gigId);
    const attendance = attendances.find((att) => att.gigId === app.gigId);
    return {
      applicationId: app.id,
      gigId: app.gigId,
      gigTitle: gig ? gig.title : 'Gig Details',
      category: gig ? gig.category : 'General',
      workLocation: gig ? gig.workLocation : '',
      fullAddress: gig ? gig.fullAddress : '',
      workDate: gig ? gig.workDate : '',
      shiftStartTime: gig ? gig.shiftStartTime : '',
      shiftEndTime: gig ? gig.shiftEndTime : '',
      paymentAmount: gig ? gig.paymentAmount : 0,
      paymentBasis: gig ? gig.paymentBasis : 'Per Shift',
      hostId: gig ? gig.hostId : '',
      hostName: gig ? gig.hostName : 'Host',
      latitude: gig ? gig.latitude : 13.0827,
      longitude: gig ? gig.longitude : 80.2707,
      bookingType: app.bookingType || attendance?.bookingType || 'INDIVIDUAL',
      gangId: app.gangId || attendance?.gangId,
      gangName: app.gangName || attendance?.gangName,
      gangCount: app.gangCount || attendance?.gangCount || 1,
      gangMembers: app.gangMembers || attendance?.gangMembers || [],
      designatedPayoutAccount: app.designatedPayoutAccount || attendance?.designatedPayoutAccount,
      consolidatedPayoutAmount: attendance?.consolidatedPayoutAmount || ((gig ? gig.paymentAmount : 0) * (app.gangCount || 1)),
      attendanceId: attendance?.id,
      checkInTime: attendance?.checkInTime,
      checkOutTime: attendance?.checkOutTime,
      attendanceStatus: attendance?.status || (app.status === 'APPROVED' ? 'NOT_STARTED' : app.status),
      hostApproved: attendance?.hostApproved || false,
      escrowStatus: attendance?.escrowStatus || (attendance?.hostApproved ? 'ESCROW_RELEASED' : 'ESCROW_LOCKED'),
      approvalDeadline: attendance?.approvalDeadline,
      workNotes: attendance?.workNotes,
      claimedDuration: attendance?.claimedDuration,
      isWaitlisted: app.isWaitlisted,
      waitlistPosition: app.waitlistPosition,
      appliedAt: app.appliedAt,
    };
  }).sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());

  res.json({ bookings });
});

// 6. Host Approves Applicant
router.post('/:id/applications/:appId/approve', authMiddleware, requireRole('GIG_HOST'), (req: AuthenticatedRequest, res: Response) => {
  const gig = db.findGigById(req.params.id);
  if (!gig) {
    res.status(404).json({ error: 'Gig not found.' });
    return;
  }

  if (gig.hostId !== req.user!.id && req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: 'You are not the host of this gig.' });
    return;
  }

  const app = db.getGigApplications(gig.id).find((a) => a.id === req.params.appId);
  if (!app) {
    res.status(404).json({ error: 'Application not found.' });
    return;
  }

  if (app.status === 'APPROVED') {
    res.status(400).json({ error: 'Application is already approved.' });
    return;
  }

  if (gig.confirmedWorkers >= gig.requiredWorkers) {
    res.status(400).json({ error: 'Cannot approve more applicants. All slots are filled. Additional candidates belong on the waiting list.' });
    return;
  }

  app.status = 'APPROVED';
  app.isWaitlisted = false;
  app.waitlistPosition = undefined;
  app.reviewedAt = new Date().toISOString();

  gig.confirmedWorkers = (gig.confirmedWorkers || 0) + 1;
  if (gig.confirmedWorkers >= gig.requiredWorkers) {
    gig.status = 'FILLED';
  }

  // Initialize attendance record for partner
  db.setGigAttendance({
    id: crypto.randomUUID(),
    gigId: gig.id,
    partnerId: app.partnerId,
    partnerName: app.partnerName,
    status: 'NOT_STARTED',
    hostApproved: false,
    createdAt: new Date().toISOString(),
  });

  db.save();

  // Notify Partner
  db.addNotification({
    id: crypto.randomUUID(),
    userId: app.partnerId,
    title: 'Gig Application Approved!',
    message: `Congratulations! Your application for "${gig.title}" has been approved. Please report to the site on ${gig.workDate} at ${gig.shiftStartTime}.`,
    type: 'SUCCESS',
    link: `/partner/dashboard`,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  res.json({ message: 'Applicant approved.', gig, application: app });
});

// 7. Host Rejects Applicant
router.post('/:id/applications/:appId/reject', authMiddleware, requireRole('GIG_HOST'), (req: AuthenticatedRequest, res: Response) => {
  const gig = db.findGigById(req.params.id);
  if (!gig || (gig.hostId !== req.user!.id && req.user!.role !== 'ADMIN')) {
    res.status(403).json({ error: 'Unauthorized.' });
    return;
  }

  const app = db.getGigApplications(gig.id).find((a) => a.id === req.params.appId);
  if (!app) {
    res.status(404).json({ error: 'Application not found.' });
    return;
  }

  app.status = 'REJECTED';
  app.reviewedAt = new Date().toISOString();
  db.save();

  res.json({ message: 'Application rejected.', application: app });
});

// 8. Cancel Confirmed Worker & Auto-Promote from Waiting List
router.post('/:id/cancel-worker', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const gig = db.findGigById(req.params.id);
  if (!gig) {
    res.status(404).json({ error: 'Gig not found.' });
    return;
  }

  const { partnerId } = req.body;
  const isHost = gig.hostId === req.user!.id;
  const isPartner = req.user!.id === partnerId;

  if (!isHost && !isPartner && req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: 'Unauthorized to cancel this assignment.' });
    return;
  }

  const app = db.findApplication(gig.id, partnerId);
  if (!app || app.status !== 'APPROVED') {
    res.status(400).json({ error: 'Confirmed assignment not found.' });
    return;
  }

  app.status = 'CANCELLED';
  gig.confirmedWorkers = Math.max(0, (gig.confirmedWorkers || 1) - 1);
  if (gig.status === 'FILLED') {
    gig.status = 'PUBLISHED';
  }

  // Auto-promote next candidate from railway waiting list
  const promoted = db.promoteNextWaitlisted(gig.id);

  if (promoted) {
    // Initialize attendance record for promoted partner
    db.setGigAttendance({
      id: crypto.randomUUID(),
      gigId: gig.id,
      partnerId: promoted.partnerId,
      partnerName: promoted.partnerName,
      status: 'NOT_STARTED',
      hostApproved: false,
      createdAt: new Date().toISOString(),
    });

    // Notify promoted partner
    db.addNotification({
      id: crypto.randomUUID(),
      userId: promoted.partnerId,
      title: 'Slot Available: Promoted from Waiting List!',
      message: `A slot opened for "${gig.title}". You have been automatically promoted and confirmed!`,
      type: 'SUCCESS',
      link: '/partner/dashboard',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }

  db.save();

  res.json({
    message: promoted
      ? `Worker removed. Candidate ${promoted.partnerName} was automatically promoted from the waiting list!`
      : 'Worker cancelled. Slot is now open for new applications.',
    gig,
    promotedCandidate: promoted,
  });
});

// 9. Geofenced Check-In (< 200m or Simulated On-Site)
router.post('/:id/check-in', authMiddleware, requireRole('GIG_PARTNER'), (req: AuthenticatedRequest, res: Response) => {
  const gig = db.findGigById(req.params.id);
  if (!gig) {
    res.status(404).json({ error: 'Gig not found.' });
    return;
  }

  const partnerId = req.user!.id;
  const app = db.findApplication(gig.id, partnerId);
  if (!app || app.status !== 'APPROVED') {
    res.status(403).json({ error: 'You are not a confirmed worker for this gig.' });
    return;
  }

  const { latitude, longitude, exceptionReason, simulateOnSite } = req.body;

  let userLat: number;
  let userLng: number;
  let distanceMeters = 5;

  if (simulateOnSite) {
    userLat = gig.latitude;
    userLng = gig.longitude;
    distanceMeters = 8;
  } else {
    if (latitude === undefined || longitude === undefined) {
      res.status(400).json({ error: 'GPS coordinates (latitude, longitude) are required for check-in.' });
      return;
    }
    userLat = parseFloat(latitude);
    userLng = parseFloat(longitude);
    const geofenceResult = isWithinGeofence(gig.latitude, gig.longitude, userLat, userLng, gig.geofenceRadiusMeters || 200);

    if (!geofenceResult.valid && !exceptionReason) {
      res.status(400).json({
        error: `Geofence check failed. You are ${geofenceResult.distanceMeters}m away from the work location (allowed radius is ${gig.geofenceRadiusMeters || 200}m). Click "Simulate On-Site GPS" if testing or provide an exception reason.`,
        distanceMeters: geofenceResult.distanceMeters,
        allowedRadius: gig.geofenceRadiusMeters || 200,
      });
      return;
    }
    distanceMeters = geofenceResult.distanceMeters;
  }

  let att = db.findGigAttendance(gig.id, partnerId);
  if (!att) {
    att = {
      id: crypto.randomUUID(),
      gigId: gig.id,
      partnerId,
      partnerName: req.user!.fullName,
      bookingType: app.bookingType || 'INDIVIDUAL',
      gangId: app.gangId,
      gangName: app.gangName,
      gangCount: app.gangCount || 1,
      gangMembers: app.gangMembers,
      designatedPayoutAccount: app.designatedPayoutAccount,
      consolidatedPayoutAmount: Math.round((gig.netPayoutAmount || (gig.paymentAmount * (1 - (gig.platformBrokerageRate || (gig.requiredWorkers <= 5 ? 10 : 5)) / 100))) * (app.gangCount || 1) * 100) / 100,
      status: 'NOT_STARTED',
      hostApproved: false,
      escrowStatus: 'ESCROW_LOCKED',
      createdAt: new Date().toISOString(),
    };
  }

  const timestamp = new Date().toISOString();
  att.checkInTime = timestamp;
  att.checkInLat = userLat;
  att.checkInLng = userLng;
  att.distanceCheckInMeters = distanceMeters;
  att.status = 'CHECKED_IN';
  if (exceptionReason) {
    att.exceptionNotes = exceptionReason;
  }

  const isGang = att.bookingType === 'REFERRAL_GANG';
  if (isGang) {
    att.workNotes = `[Unified Gang Check-In] Gang "${att.gangName || 'Gang'}" (${att.gangCount} members) arrived together at on-site venue.`;
  }

  db.setGigAttendance(att);

  // Notify Host
  db.addNotification({
    id: crypto.randomUUID(),
    userId: gig.hostId,
    title: isGang ? `Gang Checked In: ${att.gangName}` : 'Worker Checked In',
    message: isGang
      ? `${req.user!.fullName} checked in their gang of ${att.gangCount} workers for "${gig.title}" (On-site validated).`
      : `${req.user!.fullName} checked in for "${gig.title}" (${distanceMeters}m from site).`,
    type: 'INFO',
    link: `/host/gigs/${gig.id}`,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  db.broadcast('WORKER_CHECKED_IN', {
    gigId: gig.id,
    partnerId,
    partnerName: req.user!.fullName,
    isGang,
    gangName: att.gangName,
    checkInTime: timestamp,
  });

  res.json({
    message: isGang
      ? `Unified Check-in confirmed for ${att.gangName} (${att.gangCount} members). GPS verified on-site.`
      : 'Check-in recorded successfully. Live GPS verified on-site.',
    attendance: att,
    distanceMeters,
  });
});

// 10. Geofenced Check-Out & Submit Work Completion for Host Inspection Approval
router.post('/:id/check-out', authMiddleware, requireRole('GIG_PARTNER'), (req: AuthenticatedRequest, res: Response) => {
  const gig = db.findGigById(req.params.id);
  if (!gig) {
    res.status(404).json({ error: 'Gig not found.' });
    return;
  }

  const partnerId = req.user!.id;
  const att = db.findGigAttendance(gig.id, partnerId);
  if (!att || (att.status !== 'CHECKED_IN' && att.status !== 'NOT_STARTED')) {
    res.status(400).json({ error: 'You must check-in on-site before submitting work checkout.' });
    return;
  }

  const { latitude, longitude, claimedDuration, workNotes } = req.body;
  const userLat = latitude !== undefined ? parseFloat(latitude) : gig.latitude;
  const userLng = longitude !== undefined ? parseFloat(longitude) : gig.longitude;
  const geofenceResult = isWithinGeofence(gig.latitude, gig.longitude, userLat, userLng, 500);

  const timestamp = new Date().toISOString();
  att.checkOutTime = timestamp;
  att.checkOutLat = userLat;
  att.checkOutLng = userLng;
  att.distanceCheckOutMeters = geofenceResult.distanceMeters;
  att.status = 'CHECKED_OUT';
  att.claimedDuration = claimedDuration || gig.customDuration;
  att.workNotes = workNotes || att.workNotes || 'Job completed according to requirements.';

  // 24 hour host approval deadline
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + 24);
  att.approvalDeadline = deadline.toISOString();

  db.setGigAttendance(att);

  const isGang = att.bookingType === 'REFERRAL_GANG';

  // Notify Host with high-priority inspection approval alert
  db.addNotification({
    id: crypto.randomUUID(),
    userId: gig.hostId,
    title: isGang ? `Gang Work Done: ${att.gangName} Awaiting Inspection` : 'Work Done: Awaiting Inspection Approval',
    message: `${req.user!.fullName}${isGang ? ` and gang of ${att.gangCount} workers` : ''} completed shift on "${gig.title}". Please inspect work log and approve escrow release in Completion Approvals.`,
    type: 'ALERT',
    link: '/host/approvals',
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  db.broadcast('APPROVAL_REQUESTED', {
    gigId: gig.id,
    gigTitle: gig.title,
    hostId: gig.hostId,
    partnerId: req.user!.id,
    partnerName: req.user!.fullName,
    isGang,
    gangName: att.gangName,
    claimedDuration: att.claimedDuration,
  });

  res.json({
    message: 'Work Done check-out recorded. Status moved to "Awaiting Host Inspection Approval".',
    attendance: att,
  });
});

// 11. Host Approves Work & Releases Escrow Payment to Partner Wallet / Designated Bank Account
router.post('/:id/approve-work', authMiddleware, requireRole('GIG_HOST'), (req: AuthenticatedRequest, res: Response) => {
  const gig = db.findGigById(req.params.id);
  if (!gig || (gig.hostId !== req.user!.id && req.user!.role !== 'ADMIN')) {
    res.status(403).json({ error: 'Unauthorized.' });
    return;
  }

  const { partnerId } = req.body;
  if (!partnerId) {
    res.status(400).json({ error: 'Partner ID is required.' });
    return;
  }

  const att = db.findGigAttendance(gig.id, partnerId);
  if (!att) {
    res.status(404).json({ error: 'Attendance record not found.' });
    return;
  }

  if (att.hostApproved) {
    res.status(400).json({ error: 'Escrow payment for this worker/gang has already been approved and released.' });
    return;
  }

  const isGang = att.bookingType === 'REFERRAL_GANG';
  const workerCount = isGang ? (att.gangCount || 1) : 1;

  // Calculate gross, dynamic brokerage deduction, and net partner earnings (Total budget minus platform fee)
  const gross = Math.round(gig.paymentAmount * workerCount * 100) / 100;
  const calc = db.calculateGigBrokerage(gig.paymentAmount, gig.requiredWorkers, gig.isFlexiStaff, gig.flexiStaffFeePercentage);
  const feeRate = (gig.platformBrokerageRate !== undefined ? gig.platformBrokerageRate : calc.tierRate) / 100;
  const platformFee = Math.round(gross * feeRate * 100) / 100;
  const netEarnings = Math.round((gross - platformFee) * 100) / 100;

  // Mark attendance approved & Escrow Released
  att.hostApproved = true;
  att.status = 'APPROVED';
  att.escrowStatus = 'ESCROW_RELEASED';
  att.approvedAt = new Date().toISOString();

  // Release payment into Partner's Wallet (or referral group account)
  const partnerWallet = db.getOrCreateWallet(partnerId);
  partnerWallet.grossEarnings = Math.round((partnerWallet.grossEarnings + gross) * 100) / 100;
  partnerWallet.availableWithdrawableBalance = Math.round((partnerWallet.availableWithdrawableBalance + netEarnings) * 100) / 100;
  db.updateWallet(partnerId, partnerWallet);

  // Financial Ledger Entry: Escrow Released from Platform Vault to Partner
  const payoutDestination = isGang && att.designatedPayoutAccount?.upiId
    ? `UPI: ${att.designatedPayoutAccount.upiId}`
    : isGang && att.designatedPayoutAccount?.bankAccount
    ? `Bank A/C: ${att.designatedPayoutAccount.bankAccount} (${att.designatedPayoutAccount.ifsc || 'IFSC'})`
    : 'TaskHub Wallet Balance';

  const ledgerEntry: FinancialLedgerEntry = {
    id: crypto.randomUUID(),
    transactionId: `TX-ESC-REL-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
    division: 'MICRO_GIG',
    gigId: gig.id,
    title: isGang ? `Escrow Release: ${gig.title} [Gang ${att.gangName}]` : `Escrow Release: ${gig.title}`,
    payerId: 'TASKHUB_ESCROW_VAULT',
    payerName: 'TaskHub Escrow Reserve',
    payeeId: partnerId,
    payeeName: isGang ? `${att.gangName} (${att.partnerName})` : att.partnerName,
    grossAmount: gross,
    platformFee,
    applicableTaxes: 0,
    netPartnerAmount: netEarnings,
    paymentProvider: 'TASKHUB_ESCROW_RELEASE',
    paymentReference: `ESC-REL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    escrowStatus: 'RELEASED_TO_PARTNER',
    lockTimestamp: gig.escrowPaidAt || att.createdAt,
    releaseTimestamp: new Date().toISOString(),
    isDisputed: false,
    notes: isGang
      ? `Consolidated payout released for Gang of ${workerCount} workers to designated account: ${payoutDestination}`
      : `Individual worker completion approved and escrow released to wallet`,
    createdAt: new Date().toISOString(),
  };
  db.addLedgerEntry(ledgerEntry);

  // Notify Partner
  db.addNotification({
    id: crypto.randomUUID(),
    userId: partnerId,
    title: isGang ? 'Consolidated Gang Escrow Released!' : 'Escrow Payment Released!',
    message: isGang
      ? `Host approved work completion for "${att.gangName}". Consolidated escrow payment of ₹${netEarnings} has been released to your designated account (${payoutDestination}).`
      : `Host approved your completion of "${gig.title}". Payment of ₹${netEarnings} has been released and credited to your wallet balance.`,
    type: 'SUCCESS',
    link: '/partner/earnings',
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  db.save();

  db.broadcast('APPROVAL_RESOLVED', {
    gigId: gig.id,
    partnerId,
    status: 'APPROVED',
    netEarnings,
    isGang,
    gangName: att.gangName,
  });

  res.json({
    message: isGang
      ? `Consolidated escrow payment of ₹${netEarnings} for Gang "${att.gangName}" (${workerCount} members) has been approved and released!`
      : `Work approved. Escrow payment of ₹${netEarnings} successfully released to partner wallet.`,
    ledgerEntry,
    attendance: att,
    netEarnings,
    payoutDestination,
  });
});

// 12. Host Rejects Work Completion Request with Reason
router.post('/:id/reject-work', authMiddleware, requireRole('GIG_HOST'), (req: AuthenticatedRequest, res: Response) => {
  const gig = db.findGigById(req.params.id);
  if (!gig || (gig.hostId !== req.user!.id && req.user!.role !== 'ADMIN')) {
    res.status(403).json({ error: 'Unauthorized.' });
    return;
  }

  const { partnerId, reason } = req.body;
  if (!partnerId || !reason || !reason.trim()) {
    res.status(400).json({ error: 'Partner ID and rejection reason are required.' });
    return;
  }

  const att = db.findGigAttendance(gig.id, partnerId);
  if (!att) {
    res.status(404).json({ error: 'Attendance record not found.' });
    return;
  }

  if (att.hostApproved) {
    res.status(400).json({ error: 'Payment for this worker has already been released and cannot be rejected.' });
    return;
  }

  att.status = 'REJECTED';
  att.rejectionReason = reason.trim();
  att.rejectedAt = new Date().toISOString();

  // Notify Partner
  db.addNotification({
    id: crypto.randomUUID(),
    userId: partnerId,
    title: 'Work Request Rejected',
    message: `Your payment approval request for "${gig.title}" was rejected: ${att.rejectionReason}. Please contact host or TaskHub support.`,
    type: 'ALERT',
    link: '/partner/dashboard',
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  db.save();

  db.broadcast('APPROVAL_RESOLVED', {
    gigId: gig.id,
    partnerId,
    status: 'REJECTED',
    reason: att.rejectionReason,
  });

  res.json({
    message: 'Work approval request rejected.',
    attendance: att,
  });
});

// 13. Gig Host: Dedicated Completion Approvals Section (All Checked-Out Workers & Gangs)
router.get('/host/approvals', authMiddleware, requireRole('GIG_HOST'), (req: AuthenticatedRequest, res: Response) => {
  const hostId = req.user!.id;
  const hostGigs = db.getGigs().filter((g) => g.hostId === hostId);
  const gigMap = new Map(hostGigs.map((g) => [g.id, g]));

  const hostGigIds = new Set(hostGigs.map((g) => g.id));
  const attendances = db.getGigAttendance().filter((att) => hostGigIds.has(att.gigId));

  const approvalItems = attendances
    .filter((att) => att.status === 'CHECKED_OUT' || att.status === 'APPROVED' || att.status === 'REJECTED')
    .map((att) => {
      const gig = gigMap.get(att.gigId);
      const isApproved = att.hostApproved || att.status === 'APPROVED';
      const isRejected = att.status === 'REJECTED';
      const approvalStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' = isApproved
        ? 'APPROVED'
        : isRejected
        ? 'REJECTED'
        : 'PENDING_APPROVAL';

      const isGang = att.bookingType === 'REFERRAL_GANG';
      const workerCount = isGang ? (att.gangCount || 1) : 1;
      const unitPayment = gig ? gig.paymentAmount : 0;
      const consolidatedAmount = Math.round(unitPayment * workerCount * 100) / 100;

      return {
        id: att.id,
        gigId: att.gigId,
        gigTitle: gig ? gig.title : 'Gig',
        workLocation: gig ? gig.workLocation : 'Location',
        workDate: gig ? gig.workDate : '',
        partnerId: att.partnerId,
        partnerName: att.partnerName,
        bookingType: att.bookingType || 'INDIVIDUAL',
        gangId: att.gangId,
        gangName: att.gangName,
        gangCount: workerCount,
        gangMembers: att.gangMembers || [],
        designatedPayoutAccount: att.designatedPayoutAccount,
        consolidatedPayoutAmount: consolidatedAmount,
        checkInTime: att.checkInTime,
        checkOutTime: att.checkOutTime,
        distanceCheckInMeters: att.distanceCheckInMeters,
        claimedDuration: att.claimedDuration || gig?.customDuration,
        workNotes: att.workNotes || '',
        paymentAmount: unitPayment,
        paymentBasis: gig ? gig.paymentBasis : 'Per Shift',
        status: approvalStatus,
        escrowStatus: att.escrowStatus || (isApproved ? 'ESCROW_RELEASED' : 'ESCROW_LOCKED'),
        rejectionReason: att.rejectionReason,
        approvalDeadline: att.approvalDeadline,
        approvedAt: att.approvedAt,
        rejectedAt: att.rejectedAt,
        createdAt: att.createdAt,
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ approvals: approvalItems });
});

export default router;
