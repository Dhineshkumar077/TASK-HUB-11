import express, { type Response } from 'express';
import crypto from 'crypto';
import { db } from '../db.ts';
import { sendOTP, verifyOTP } from '../otp.ts';
import { hashPassword, verifyPassword, validatePasswordStrength, generateSessionToken } from '../auth.ts';
import { authMiddleware } from '../middleware.ts';
import type { AuthenticatedRequest } from '../middleware.ts';
import { maskEmail, maskPhoneNumber } from '../privacyFilter.ts';
import type { User, UserRole } from '../types.ts';

const router = express.Router();

const applyCorsHeaders = (res: express.Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

router.use((req, res, next) => {
  applyCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

router.options('/send-otp', (_req, res) => {
  applyCorsHeaders(res);
  res.sendStatus(204);
});

router.options('/verify-otp', (_req, res) => {
  applyCorsHeaders(res);
  res.sendStatus(204);
});

// 1. Request OTP (Email or SMS)
router.post('/send-otp', async (req, res: express.Response) => {
  const { target, channel } = req.body;

  if (!target || !channel) {
    res.status(400).json({ error: 'Target (email or mobile) and channel (EMAIL or SMS) are required.' });
    return;
  }

  if (channel !== 'EMAIL' && channel !== 'SMS') {
    res.status(400).json({ error: 'Channel must be either EMAIL or SMS.' });
    return;
  }

  const result = await sendOTP(target, channel);
  if (!result.success) {
    res.status(429).json(result);
    return;
  }

  res.json(result);
});

// 2. Verify OTP
router.post('/verify-otp', (req, res: express.Response) => {
  const { target, channel, code } = req.body;

  if (!target || !channel || !code) {
    res.status(400).json({ error: 'Target, channel, and code are required.' });
    return;
  }

  const result = verifyOTP(target, channel, code);
  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.json(result);
});

// 3. User Registration (Role-specific without dropdown)
router.post('/register/:roleParam', (req, res: Response) => {
  const roleParam = req.params.roleParam.toUpperCase();
  const validRoles: Record<string, UserRole> = {
    'GIG-HOST': 'GIG_HOST',
    'GIG_HOST': 'GIG_HOST',
    'GIG-PARTNER': 'GIG_PARTNER',
    'GIG_PARTNER': 'GIG_PARTNER',
    'SERVICE-SEEKER': 'SERVICE_SEEKER',
    'SERVICE_SEEKER': 'SERVICE_SEEKER',
    'TECH-PARTNER': 'TECH_PARTNER',
    'TECH_PARTNER': 'TECH_PARTNER',
  };

  if (roleParam === 'ADMIN' || roleParam === 'MASTER-ADMIN' || roleParam === 'SUPER-ADMIN') {
    const adminCount = db.getAdminCount();
    if (adminCount >= 1) {
      res.status(403).json({
        error: 'Admin Account Limit Reached. Registration Closed.',
        code: 'ADMIN_LIMIT_REACHED',
      });
      return;
    }
  }

  const assignedRole = validRoles[roleParam];
  if (!assignedRole) {
    res.status(400).json({ error: 'Invalid portal registration route.' });
    return;
  }

  const {
    fullName,
    email,
    mobile,
    password,
    confirmPassword,
    isEmailVerified,
    isPhoneVerified,
    isMobileVerified,
    termsAccepted,
    privacyAccepted,
  } = req.body;

  // Validation
  if (!fullName || !email || !mobile || !password || !confirmPassword) {
    res.status(400).json({ error: 'All fields are mandatory.' });
    return;
  }

  if (password !== confirmPassword) {
    res.status(400).json({ error: 'Passwords do not match.' });
    return;
  }

  if (!termsAccepted || !privacyAccepted) {
    res.status(400).json({ error: 'You must accept the Terms and Conditions and Privacy Policy.' });
    return;
  }

  const passwordCheck = validatePasswordStrength(password, false);
  if (!passwordCheck.valid) {
    res.status(400).json({ error: passwordCheck.error });
    return;
  }

  // Check uniqueness
  if (db.findUserByEmail(email)) {
    res.status(409).json({ error: 'An account with this email address already exists.' });
    return;
  }

  if (db.findUserByMobile(mobile)) {
    res.status(409).json({ error: 'An account with this mobile number already exists.' });
    return;
  }

  const newUser: User = {
    id: crypto.randomUUID(),
    email: email.trim().toLowerCase(),
    mobile: mobile.trim(),
    fullName: fullName.trim(),
    passwordHash: hashPassword(password),
    role: assignedRole,
    status: 'ACTIVE',
    emailVerified: true,
    mobileVerified: true,
    rating: 0.0,
    totalReviews: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.addUser(newUser);

  // Generate session
  const token = generateSessionToken();
  db.addSession({
    token,
    userId: newUser.id,
    role: newUser.role,
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  const { passwordHash, ...safeUser } = newUser;
  res.status(201).json({
    message: 'Registration successful.',
    token,
    user: safeUser,
  });
});

// 4. Portal Login
router.post('/login/:roleParam', (req, res: Response) => {
  const roleParam = req.params.roleParam.toUpperCase();
  const validRoles: Record<string, UserRole> = {
    'GIG-HOST': 'GIG_HOST',
    'GIG_HOST': 'GIG_HOST',
    'GIG-PARTNER': 'GIG_PARTNER',
    'GIG_PARTNER': 'GIG_PARTNER',
    'SERVICE-SEEKER': 'SERVICE_SEEKER',
    'SERVICE_SEEKER': 'SERVICE_SEEKER',
    'TECH-PARTNER': 'TECH_PARTNER',
    'TECH_PARTNER': 'TECH_PARTNER',
  };

  const expectedRole = validRoles[roleParam];
  if (!expectedRole) {
    res.status(400).json({ error: 'Invalid portal login route.' });
    return;
  }

  const { emailOrMobile, password } = req.body;
  if (!emailOrMobile || !password) {
    res.status(400).json({ error: 'Email/Mobile and password are required.' });
    return;
  }

  const identifier = emailOrMobile.trim();
  const user = identifier.includes('@')
    ? db.findUserByEmail(identifier)
    : db.findUserByMobile(identifier);

  if (!user) {
    res.status(401).json({ error: 'Invalid credentials. User not found.' });
    return;
  }

  if (user.role !== expectedRole) {
    res.status(403).json({
      error: `Account role mismatch. This account is registered as a ${user.role.replace('_', ' ')}. Please use the appropriate portal login.`,
    });
    return;
  }

  if (user.status === 'SUSPENDED') {
    res.status(403).json({
      error: `Your account has been suspended: ${user.suspensionReason || 'Contact TaskHub administration.'}`,
    });
    return;
  }

  if (user.status === 'BANNED') {
    res.status(403).json({ error: 'This account is permanently banned.' });
    return;
  }

  const isMatch = verifyPassword(password, user.passwordHash);
  if (!isMatch) {
    res.status(401).json({ error: 'Incorrect password.' });
    return;
  }

  const token = generateSessionToken();
  db.addSession({
    token,
    userId: user.id,
    role: user.role,
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  const { passwordHash, ...safeUser } = user;
  res.json({
    message: 'Login successful.',
    token,
    user: safeUser,
  });
});

// 5. Master Admin Login (Email/Mobile + Password)
router.post('/admin-login', (req, res: Response) => {
  const { email, mobile, emailOrMobile, password } = req.body;
  const identifier = (emailOrMobile || email || mobile || '').trim();

  if (!identifier || !password) {
    res.status(400).json({ error: 'Admin Email/Mobile and administrative password are required.' });
    return;
  }

  const primaryAdmin = db.getPrimaryAdmin();
  if (!primaryAdmin) {
    res.status(404).json({
      error: 'No Master Admin account is currently configured. Please complete initial setup first.',
      code: 'ADMIN_NOT_CONFIGURED',
    });
    return;
  }

  // Verify identifier matches registered Admin's email or mobile
  const idLower = identifier.toLowerCase();
  const idDigits = identifier.replace(/\D/g, '');
  const adminEmail = primaryAdmin.email.toLowerCase();
  const adminDigits = primaryAdmin.mobile.replace(/\D/g, '');

  const matchesEmail = idLower === adminEmail;
  const matchesMobile = idDigits.length >= 7 && (adminDigits.endsWith(idDigits) || idDigits.endsWith(adminDigits));

  if (!matchesEmail && !matchesMobile) {
    res.status(401).json({ error: 'Invalid credentials. Administrative account not found.' });
    return;
  }

  // Verify administrative password
  const isMatch = verifyPassword(password, primaryAdmin.passwordHash);
  if (!isMatch) {
    res.status(401).json({ error: 'Invalid administrative password.' });
    return;
  }

  const token = generateSessionToken();
  db.addSession({
    token,
    userId: primaryAdmin.id,
    role: 'ADMIN',
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours for admin session
  });

  const { passwordHash, ...safeUser } = primaryAdmin;
  res.json({
    message: 'Master Admin authentication successful.',
    token,
    user: safeUser,
  });
});

// 5-2fa. Request Login 2FA OTP Code
router.post('/admin/send-2fa', async (req, res: Response) => {
  const { identifier, channel } = req.body;
  const deliveryChannel: 'EMAIL' | 'SMS' = channel === 'SMS' ? 'SMS' : 'EMAIL';

  const primaryAdmin = db.getPrimaryAdmin();
  if (!primaryAdmin) {
    res.status(404).json({ error: 'No administrative account found. Please initialize the platform first.' });
    return;
  }

  if (identifier) {
    const trimmed = String(identifier).trim().toLowerCase();
    const cleanDigits = trimmed.replace(/\D/g, '');
    const adminEmail = primaryAdmin.email.toLowerCase();
    const adminDigits = primaryAdmin.mobile.replace(/\D/g, '');

    const matchesEmail = trimmed === adminEmail;
    const matchesMobile = cleanDigits.length >= 7 && (adminDigits.endsWith(cleanDigits) || cleanDigits.endsWith(adminDigits));

    if (!matchesEmail && !matchesMobile) {
      res.status(401).json({ error: 'Administrative identifier does not match registered Super Admin.' });
      return;
    }
  }

  const destination = deliveryChannel === 'EMAIL' ? primaryAdmin.email : primaryAdmin.mobile;
  const result = await sendOTP(destination, deliveryChannel);

  res.json({
    success: result.success,
    message: result.message || `2FA code dispatched to authorized ${deliveryChannel === 'EMAIL' ? 'Email' : 'Mobile phone'}.`,
    cooldownSeconds: result.cooldownSeconds || 60,
    devVerificationCode: result.devVerificationCode,
    maskedTarget: deliveryChannel === 'EMAIL' ? maskEmail(primaryAdmin.email) : maskPhoneNumber(primaryAdmin.mobile),
  });
});

// 5a. Admin Gateway Status & Registration Lock Check
router.get('/admin/status', (_req, res: Response) => {
  const adminCount = db.getAdminCount();
  const primaryAdmin = db.getPrimaryAdmin();

  res.json({
    adminCount,
    isRegistrationClosed: adminCount >= 1,
    hasConfiguredAdmin: adminCount > 0,
    maskedEmail: primaryAdmin ? maskEmail(primaryAdmin.email) : null,
    maskedMobile: primaryAdmin ? maskPhoneNumber(primaryAdmin.mobile) : null,
  });
});

// 5b. Strict Single-Admin Registration (Max Limit = 1)
router.post('/admin/register', (req, res: Response) => {
  const adminCount = db.getAdminCount();
  if (adminCount >= 1) {
    res.status(403).json({
      error: 'Admin Account Limit Reached. Registration Closed.',
      code: 'ADMIN_LIMIT_REACHED',
    });
    return;
  }

  const {
    fullName,
    email,
    mobile,
    password,
    confirmPassword,
    isEmailVerified,
    isPhoneVerified,
    isMobileVerified,
    termsAccepted,
    privacyAccepted,
  } = req.body;

  if (!fullName || !email || !mobile || !password || !confirmPassword) {
    res.status(400).json({ error: 'All administrative onboarding fields are mandatory.' });
    return;
  }

  if (password !== confirmPassword) {
    res.status(400).json({ error: 'Passwords do not match.' });
    return;
  }

  const passwordCheck = validatePasswordStrength(password, true); // Admin requires 10+ chars, uppercase, digit, symbol
  if (!passwordCheck.valid) {
    res.status(400).json({ error: passwordCheck.error });
    return;
  }

  if (db.findUserByEmail(email)) {
    res.status(409).json({ error: 'An account with this email address already exists.' });
    return;
  }

  if (db.findUserByMobile(mobile)) {
    res.status(409).json({ error: 'An account with this mobile number already exists.' });
    return;
  }

  const newAdmin: User = {
    id: crypto.randomUUID(),
    email: email.trim().toLowerCase(),
    mobile: mobile.trim(),
    fullName: fullName.trim(),
    passwordHash: hashPassword(password),
    role: 'ADMIN',
    status: 'ACTIVE',
    emailVerified: true,
    mobileVerified: true,
    rating: 0.0,
    totalReviews: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.addUser(newAdmin);

  const token = generateSessionToken();
  db.addSession({
    token,
    userId: newAdmin.id,
    role: 'ADMIN',
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });

  const { passwordHash: _, ...safeAdmin } = newAdmin;
  res.status(201).json({
    message: 'Master Admin account initialized successfully.',
    token,
    user: safeAdmin,
  });
});

// 5c. Admin Password Recovery - Request Code (Sent exclusively to authorized Super Admin's pre-registered email or mobile via SMS)
router.post('/admin/forgot-password/request', async (req, res: Response) => {
  const { identifier, channel } = req.body;

  if (!identifier || !channel) {
    res.status(400).json({ error: 'Admin identifier (email or mobile) and recovery channel (EMAIL or SMS) are required.' });
    return;
  }

  if (channel !== 'EMAIL' && channel !== 'SMS') {
    res.status(400).json({ error: 'Channel must be either EMAIL or SMS.' });
    return;
  }

  const primaryAdmin = db.getPrimaryAdmin();
  if (!primaryAdmin) {
    res.status(404).json({ error: 'No administrative account found in the system database.' });
    return;
  }

  // Strict verification: user input must match pre-registered Super Admin
  const inputTrimmed = String(identifier).trim().toLowerCase();
  const inputDigits = inputTrimmed.replace(/\D/g, '');
  const adminEmail = primaryAdmin.email.toLowerCase();
  const adminMobileDigits = primaryAdmin.mobile.replace(/\D/g, '');

  const matchesEmail = inputTrimmed === adminEmail;
  const matchesMobile = inputDigits.length >= 7 && (adminMobileDigits.endsWith(inputDigits) || inputDigits.endsWith(adminMobileDigits));

  if (!matchesEmail && !matchesMobile) {
    res.status(403).json({
      error: 'Access restricted: password recovery is exclusively permitted for the pre-registered authorized Super Admin.',
    });
    return;
  }

  // Exclusively send to the authorized admin's recorded contact
  const destination = channel === 'EMAIL' ? primaryAdmin.email : primaryAdmin.mobile;
  const otpResult = await sendOTP(destination, channel);

  if (!otpResult.success) {
    res.status(429).json(otpResult);
    return;
  }

  res.json({
    success: true,
    message: `Recovery verification code dispatched to authorized ${channel === 'EMAIL' ? 'email' : 'mobile phone via SMS'}.`,
    channel,
    maskedTarget: channel === 'EMAIL' ? maskEmail(primaryAdmin.email) : maskPhoneNumber(primaryAdmin.mobile),
    devVerificationCode: otpResult.devVerificationCode,
  });
});

// 5d. Admin Password Recovery - Verify OTP & Reset Access
router.post('/admin/forgot-password/verify-reset', (req, res: Response) => {
  const { identifier, channel, code, newPassword, confirmPassword } = req.body;

  if (!identifier || !channel || !code || !newPassword || !confirmPassword) {
    res.status(400).json({ error: 'All recovery fields (identifier, channel, code, new password, confirm password) are required.' });
    return;
  }

  if (newPassword !== confirmPassword) {
    res.status(400).json({ error: 'New password and confirmation do not match.' });
    return;
  }

  const passwordCheck = validatePasswordStrength(newPassword, true);
  if (!passwordCheck.valid) {
    res.status(400).json({ error: passwordCheck.error });
    return;
  }

  const primaryAdmin = db.getPrimaryAdmin();
  if (!primaryAdmin) {
    res.status(404).json({ error: 'No administrative account found in the system database.' });
    return;
  }

  const inputTrimmed = String(identifier).trim().toLowerCase();
  const inputDigits = inputTrimmed.replace(/\D/g, '');
  const adminEmail = primaryAdmin.email.toLowerCase();
  const adminMobileDigits = primaryAdmin.mobile.replace(/\D/g, '');

  const matchesEmail = inputTrimmed === adminEmail;
  const matchesMobile = inputDigits.length >= 7 && (adminMobileDigits.endsWith(inputDigits) || inputDigits.endsWith(adminMobileDigits));

  if (!matchesEmail && !matchesMobile) {
    res.status(403).json({
      error: 'Access restricted: password recovery is exclusively permitted for the pre-registered authorized Super Admin.',
    });
    return;
  }

  const destination = channel === 'EMAIL' ? primaryAdmin.email : primaryAdmin.mobile;
  const verifyResult = verifyOTP(destination, channel, code);
  if (!verifyResult.success) {
    res.status(400).json({ error: verifyResult.message || 'Invalid or expired recovery code.' });
    return;
  }

  // Update password in database
  db.updateUser(primaryAdmin.id, {
    passwordHash: hashPassword(newPassword),
  });

  // Security: Invalidate all existing sessions for this admin
  db.removeSessionsForUser(primaryAdmin.id);

  res.json({
    success: true,
    message: 'Master Admin password has been successfully reset. Please sign in with your new credentials.',
  });
});

// 6. Current User Session Check
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { passwordHash, ...safeUser } = req.user!;
  res.json({ user: safeUser });
});

// 7. Update User Profile
router.put('/profile', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { fullName, bio, preferredLocation, avatarUrl } = req.body;

  const updates: Partial<User> = {};
  if (fullName && fullName.trim()) updates.fullName = fullName.trim();
  if (bio !== undefined) updates.bio = String(bio).trim();
  if (preferredLocation !== undefined) updates.preferredLocation = String(preferredLocation).trim();
  if (avatarUrl !== undefined) updates.avatarUrl = String(avatarUrl).trim();

  const updatedUser = db.updateUser(userId, updates);
  if (!updatedUser) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const { passwordHash, ...safeUser } = updatedUser;
  res.json({
    message: 'Profile updated successfully.',
    user: safeUser,
  });
});

// 8. User Activity & Account History (Role-tailored persistent history)
router.get('/history', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const userId = user.id;
  const role = user.role;

  let historyData: any = {};

  if (role === 'GIG_HOST') {
    const rawGigs = db.getGigs().filter((g) => g.hostId === userId);
    const gigIds = new Set(rawGigs.map((g) => g.id));
    const applications = db.getGigApplications().filter((a) => gigIds.has(a.gigId));
    const attendance = db.getGigAttendance().filter((att) => gigIds.has(att.gigId));
    const ledger = db.getFinancialLedger().filter((l) => l.payerId === userId);

    const gigs = rawGigs.map((g) => {
      const gigApps = applications.filter((a) => a.gigId === g.id);
      const confirmed = gigApps.filter((a) => a.status === 'APPROVED');
      const gigAtt = attendance.filter((att) => att.gigId === g.id);
      const hasActiveAttendance = gigAtt.some(
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
        applicationsCount: gigApps.length,
        isLocked,
        lockReason: isLocked
          ? 'Locked to protect active workers and escrow commitments.'
          : undefined,
      };
    });

    historyData = {
      role,
      gigs,
      applications,
      attendance,
      ledger,
      stats: {
        totalPostedGigs: gigs.length,
        activeGigs: gigs.filter((g) => g.status === 'PUBLISHED' || g.status === 'FILLED').length,
        completedGigs: gigs.filter((g) => g.status === 'COMPLETED').length,
        cancelledGigs: gigs.filter((g) => g.status === 'CANCELLED').length,
        totalApplicationsReceived: applications.length,
        totalConfirmedWorkers: gigs.reduce((sum, g) => sum + (g.confirmedWorkers || 0), 0),
        pendingApprovalsCount: attendance.filter((att) => att.status === 'CHECKED_OUT' && !att.hostApproved).length,
      },
    };
  } else if (role === 'GIG_PARTNER') {
    const applications = db.getApplicationsByPartner(userId);
    const attendance = db.getAttendanceByPartner(userId);
    const allGigs = db.getGigs();
    const partnerGigs = allGigs.filter((g) =>
      applications.some((a) => a.gigId === g.id)
    );
    const ledger = db.getFinancialLedger().filter((l) => l.payeeId === userId);
    const wallet = db.getOrCreateWallet(userId);
    const withdrawals = db.getWithdrawalsByPartner(userId);
    const reviews = db.getReviews(userId);

    // Merge applications with gig info and attendance for comprehensive work history log
    const workHistory = applications.map((app) => {
      const gig = allGigs.find((g) => g.id === app.gigId);
      const att = attendance.find((at) => at.gigId === app.gigId);
      const hostReview = reviews.find((r) => r.reviewerId === gig?.hostId);
      const payoutEntry = ledger.find((l) => l.gigId === app.gigId && l.payeeId === userId);
      return {
        ...app,
        gigTitle: gig?.title || 'Shift Task',
        gigCategory: gig?.category,
        workDate: gig?.workDate,
        workLocation: gig?.workLocation,
        hostName: gig?.hostName,
        paymentAmount: gig?.paymentAmount || 0,
        paymentBasis: gig?.paymentBasis || 'Per Shift',
        attendance: att,
        hostReview,
        payoutAmount: payoutEntry ? payoutEntry.grossAmount : (att?.hostApproved ? gig?.paymentAmount : 0),
        isCompleted: !!att?.hostApproved,
      };
    });

    historyData = {
      role,
      applications,
      attendance,
      gigs: partnerGigs,
      workHistory,
      ledger,
      wallet,
      withdrawals,
      reviews,
      stats: {
        totalApplied: applications.length,
        approvedApplications: applications.filter((a) => a.status === 'APPROVED').length,
        waitlistedApplications: applications.filter((a) => a.status === 'WAITLISTED').length,
        completedShifts: attendance.filter((att) => att.hostApproved).length,
        pendingApprovalShifts: attendance.filter((att) => att.status === 'CHECKED_OUT' && !att.hostApproved).length,
        totalEarnings: wallet.grossEarnings || 0,
        availableBalance: wallet.availableWithdrawableBalance || 0,
      },
    };
  } else if (role === 'TECH_PARTNER') {
    const rawServices = db.getServicesByTechPartner(userId);
    const bookings = db.getBookingsForTechPartner(userId);
    const ledger = db.getFinancialLedger().filter((l) => l.payeeId === userId);
    const wallet = db.getOrCreateWallet(userId);
    const withdrawals = db.getWithdrawalsByPartner(userId);

    const services = rawServices.map((s) => {
      const activeBookings = bookings.filter(
        (b) =>
          b.serviceId === s.id &&
          (b.status === 'CONFIRMED' ||
            b.status === 'IN_PROGRESS' ||
            b.paymentStatus === 'ESCROW_LOCKED' ||
            b.status === 'AWAITING_BALANCE_TOPUP')
      );
      const isLocked = activeBookings.length > 0;
      return {
        ...s,
        activeBookingsCount: activeBookings.length,
        totalBookingsCount: bookings.filter((b) => b.serviceId === s.id).length,
        isLocked,
        lockReason: isLocked
          ? `Locked due to ${activeBookings.length} active client booking(s) with locked escrow funds.`
          : undefined,
      };
    });

    historyData = {
      role,
      services,
      bookings,
      ledger,
      wallet,
      withdrawals,
      stats: {
        totalServices: services.length,
        totalBookings: bookings.length,
        completedBookings: bookings.filter((b) => b.status === 'COMPLETED').length,
        inProgressBookings: bookings.filter((b) => b.status === 'IN_PROGRESS' || b.status === 'CONFIRMED').length,
        totalEarnings: wallet.grossEarnings || 0,
        availableBalance: wallet.availableWithdrawableBalance || 0,
      },
    };
  } else if (role === 'SERVICE_SEEKER') {
    const bookings = db.getBookingsBySeeker(userId);
    const ledger = db.getFinancialLedger().filter((l) => l.payerId === userId);
    const disputes = db.getDisputes().filter((d) => d.raisedBy === userId);

    historyData = {
      role,
      bookings,
      ledger,
      disputes,
      stats: {
        totalBookings: bookings.length,
        completedBookings: bookings.filter((b) => b.status === 'COMPLETED').length,
        activeBookings: bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS').length,
        totalSpent: ledger.reduce((sum, l) => sum + l.grossAmount, 0),
        disputesCount: disputes.length,
      },
    };
  } else {
    historyData = {
      role: 'ADMIN',
      stats: {
        totalUsers: db.getUsers().length,
        totalGigs: db.getGigs().length,
        totalServices: db.getServices().length,
        totalBookings: db.getBookings().length,
      },
    };
  }

  res.json({ history: historyData });
});

// 9. Logout
router.post('/logout', (req, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    db.removeSession(token);
  }
  res.json({ message: 'Logged out successfully.' });
});

export default router;
