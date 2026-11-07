import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db.ts';
import { authMiddleware, requireRole } from '../middleware.ts';
import type { AuthenticatedRequest } from '../middleware.ts';
import type { Announcement, DelayedApprovalWarning } from '../types.ts';

const router = Router();

// Require ADMIN role for all administrative endpoints
router.use(authMiddleware, requireRole('ADMIN'));

// 1. Master Dashboard Overview Metrics
router.get('/overview', (req: AuthenticatedRequest, res: Response) => {
  const users = db.getUsers();
  const gigs = db.getGigs();
  const bookings = db.getBookings();
  const ledger = db.getFinancialLedger();
  const disputes = db.getDisputes();

  const gigHostsCount = users.filter((u) => u.role === 'GIG_HOST').length;
  const gigPartnersCount = users.filter((u) => u.role === 'GIG_PARTNER').length;
  const serviceSeekersCount = users.filter((u) => u.role === 'SERVICE_SEEKER').length;
  const techPartnersCount = users.filter((u) => u.role === 'TECH_PARTNER').length;

  const activeAccounts = users.filter((u) => u.status === 'ACTIVE').length;
  const suspendedAccounts = users.filter((u) => u.status === 'SUSPENDED').length;
  const bannedAccounts = users.filter((u) => u.status === 'BANNED').length;

  const completedGigs = gigs.filter((g) => g.status === 'COMPLETED').length;
  const completedBookings = bookings.filter((b) => b.status === 'COMPLETED').length;
  const totalCompletedJobs = completedGigs + completedBookings;

  const pendingApprovalsGigs = db.getGigAttendance().filter((a) => a.status === 'CHECKED_OUT' && !a.hostApproved).length;
  const pendingApprovalsBookings = bookings.filter((b) => b.status === 'COMPLETED' && !b.customerApproved).length;
  const totalPendingApprovals = pendingApprovalsGigs + pendingApprovalsBookings;

  const openDisputes = disputes.filter((d) => d.resolutionStatus === 'OPEN').length;

  // Financial Calculations
  const grossTransactionVolume = ledger.reduce((acc, t) => acc + t.grossAmount, 0);
  const microGigRevenue = ledger
    .filter((t) => t.division === 'MICRO_GIG')
    .reduce((acc, t) => acc + t.platformFee, 0);
  const localServiceRevenue = ledger
    .filter((t) => t.division === 'LOCAL_SERVICE')
    .reduce((acc, t) => acc + t.platformFee, 0);
  const totalPlatformRevenue = microGigRevenue + localServiceRevenue;

  const escrowLockedBalances = ledger
    .filter((t) => t.escrowStatus === 'ESCROW_LOCKED')
    .reduce((acc, t) => acc + t.netPartnerAmount, 0);

  res.json({
    counts: {
      gigHostsCount,
      gigPartnersCount,
      serviceSeekersCount,
      techPartnersCount,
      totalUsers: users.filter((u) => u.role !== 'ADMIN').length,
      activeAccounts,
      suspendedAccounts,
      bannedAccounts,
      totalGigs: gigs.length,
      totalBookings: bookings.length,
      totalCompletedJobs,
      totalPendingApprovals,
      openDisputes,
    },
    finances: {
      totalPlatformRevenue: Math.round(totalPlatformRevenue * 100) / 100,
      microGigRevenue: Math.round(microGigRevenue * 100) / 100,
      localServiceRevenue: Math.round(localServiceRevenue * 100) / 100,
      grossTransactionVolume: Math.round(grossTransactionVolume * 100) / 100,
      escrowLockedBalances: Math.round(escrowLockedBalances * 100) / 100,
    },
  });
});

// 2. Micro-Gig Economy Monitor: User Directory
router.get('/micro-gig/users', (req: AuthenticatedRequest, res: Response) => {
  const users = db
    .getUsers()
    .filter((u) => u.role === 'GIG_HOST' || u.role === 'GIG_PARTNER')
    .map(({ passwordHash, ...safe }) => safe);
  res.json({ users });
});

// 3. User Suspension & Ban Controls
router.post('/users/:id/status', (req: AuthenticatedRequest, res: Response) => {
  const { status, reason } = req.body;
  if (!status || !['ACTIVE', 'SUSPENDED', 'BANNED'].includes(status)) {
    res.status(400).json({ error: 'Valid status (ACTIVE, SUSPENDED, BANNED) is required.' });
    return;
  }

  const user = db.findUserById(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  if (user.role === 'ADMIN') {
    res.status(403).json({ error: 'Cannot modify administrative account status.' });
    return;
  }

  user.status = status;
  user.suspensionReason = reason || undefined;
  user.suspendedAt = status !== 'ACTIVE' ? new Date().toISOString() : undefined;
  user.suspendedBy = status !== 'ACTIVE' ? req.user!.id : undefined;

  db.save();

  // Notify User
  db.addNotification({
    id: crypto.randomUUID(),
    userId: user.id,
    title: `Account Status Changed: ${status}`,
    message: status === 'ACTIVE'
      ? 'Your TaskHub account has been reinstated.'
      : `Your account has been set to ${status}: ${reason || 'Administrative policy review.'}`,
    type: status === 'ACTIVE' ? 'SUCCESS' : 'ALERT',
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  res.json({ message: `User status updated to ${status}.`, user });
});

// 4. Micro-Gig Economy Monitor: Job Monitor
router.get('/micro-gig/jobs', (req: AuthenticatedRequest, res: Response) => {
  const gigs = db.getGigs();
  const applications = db.getGigApplications();
  const attendance = db.getGigAttendance();

  const enriched = gigs.map((gig) => {
    const apps = applications.filter((a) => a.gigId === gig.id);
    const atts = attendance.filter((a) => a.gigId === gig.id);
    return {
      ...gig,
      totalApplications: apps.length,
      waitlistCount: apps.filter((a) => a.isWaitlisted && a.status === 'WAITLISTED').length,
      attendanceCount: atts.length,
    };
  });

  res.json({ jobs: enriched });
});

// 5. Delayed Host Approval Monitoring (>24 hours)
router.get('/micro-gig/delayed-approvals', (req: AuthenticatedRequest, res: Response) => {
  const attendance = db.getGigAttendance();
  const delayedList: DelayedApprovalWarning[] = [];
  const now = Date.now();

  for (const att of attendance) {
    if (att.status === 'CHECKED_OUT' && !att.hostApproved && att.checkOutTime) {
      const checkOutMs = new Date(att.checkOutTime).getTime();
      const hoursElapsed = Math.round(((now - checkOutMs) / (1000 * 60 * 60)) * 10) / 10;

      const gig = db.findGigById(att.gigId);
      const host = gig ? db.findUserById(gig.hostId) : undefined;

      delayedList.push({
        gigId: att.gigId,
        gigTitle: gig?.title || 'Unknown Gig',
        hostId: gig?.hostId || '',
        hostName: host?.fullName || gig?.hostName || 'Host',
        hostEmail: host?.email || '',
        partnerId: att.partnerId,
        partnerName: att.partnerName,
        completionTime: att.checkOutTime,
        approvalDeadline: att.approvalDeadline || new Date(checkOutMs + 24 * 3600000).toISOString(),
        hoursDelayed: Math.max(0, hoursElapsed - 24),
        reminderSentCount: 0,
      });
    }
  }

  res.json({ delayedApprovals: delayedList });
});

// 6. Send Warning Reminder to Delayed Host
router.post('/micro-gig/delayed-approvals/:gigId/send-reminder', (req: AuthenticatedRequest, res: Response) => {
  const gig = db.findGigById(req.params.gigId);
  if (!gig) {
    res.status(404).json({ error: 'Gig not found.' });
    return;
  }

  const { partnerId } = req.body;
  const host = db.findUserById(gig.hostId);

  // Dispatch reminder notification
  db.addNotification({
    id: crypto.randomUUID(),
    userId: gig.hostId,
    title: 'URGENT: Host Approval Required',
    message: `Reminder: Shift completed for "${gig.title}". You have exceeded or are approaching the standard 24-hour approval deadline. Please review the work and approve payment release.`,
    type: 'ALERT',
    link: `/host/gigs/${gig.id}`,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  console.log(`[Admin Reminder Dispatch] Warning reminder dispatched to Host ${host?.email} for Gig ${gig.id}`);

  res.json({
    message: `Warning reminder successfully dispatched to host ${host?.fullName || 'Host'}.`,
    deliveryTimestamp: new Date().toISOString(),
  });
});

// 7. Accountant Escrow Ledger
router.get('/micro-gig/escrow-ledger', (req: AuthenticatedRequest, res: Response) => {
  const ledger = db.getFinancialLedger().filter((l) => l.division === 'MICRO_GIG');
  res.json({ ledger });
});

// 8. Local Service Marketplace Monitor: Users
router.get('/local-service/users', (req: AuthenticatedRequest, res: Response) => {
  const users = db
    .getUsers()
    .filter((u) => u.role === 'SERVICE_SEEKER' || u.role === 'TECH_PARTNER')
    .map(({ passwordHash, ...safe }) => safe);
  res.json({ users });
});

// 9. Local Service Marketplace Monitor: Services & Categories
router.get('/local-service/services', (req: AuthenticatedRequest, res: Response) => {
  const services = db.getServices();
  res.json({ services });
});

// 10. Toggle Service Active Status
router.post('/local-service/services/:id/toggle', (req: AuthenticatedRequest, res: Response) => {
  const service = db.findServiceById(req.params.id);
  if (!service) {
    res.status(404).json({ error: 'Service not found.' });
    return;
  }

  service.isActive = !service.isActive;
  db.save();

  res.json({ message: `Service listing ${service.isActive ? 'activated' : 'disabled'}.`, service });
});

// 11. Local Service Marketplace Monitor: Bookings & Financial Ledger
router.get('/local-service/bookings', (req: AuthenticatedRequest, res: Response) => {
  const bookings = db.getBookings();
  const ledger = db.getFinancialLedger().filter((l) => l.division === 'LOCAL_SERVICE');
  res.json({ bookings, ledger });
});

// 12. Local Service Revenue Reports
router.get('/local-service/revenue-reports', (req: AuthenticatedRequest, res: Response) => {
  const ledger = db.getFinancialLedger().filter((l) => l.division === 'LOCAL_SERVICE');

  const totalVolume = ledger.reduce((acc, l) => acc + l.grossAmount, 0);
  const totalPlatformFees = ledger.reduce((acc, l) => acc + l.platformFee, 0);
  const totalSettled = ledger
    .filter((l) => l.escrowStatus === 'RELEASED_TO_PARTNER')
    .reduce((acc, l) => acc + l.netPartnerAmount, 0);
  const pendingSettlement = ledger
    .filter((l) => l.escrowStatus === 'ESCROW_LOCKED')
    .reduce((acc, l) => acc + l.netPartnerAmount, 0);

  // Group by category
  const bookings = db.getBookings();
  const categoryBreakdown: Record<string, { count: number; volume: number; revenue: number }> = {};

  for (const b of bookings) {
    const cat = b.category || 'General';
    if (!categoryBreakdown[cat]) {
      categoryBreakdown[cat] = { count: 0, volume: 0, revenue: 0 };
    }
    categoryBreakdown[cat].count += 1;
    categoryBreakdown[cat].volume += b.totalPayableAmount;
    categoryBreakdown[cat].revenue += b.platformFee;
  }

  res.json({
    metrics: {
      totalVolume: Math.round(totalVolume * 100) / 100,
      totalPlatformFees: Math.round(totalPlatformFees * 100) / 100,
      totalSettled: Math.round(totalSettled * 100) / 100,
      pendingSettlement: Math.round(pendingSettlement * 100) / 100,
    },
    categoryBreakdown,
  });
});

// 13. Admin Command Center: Broadcast Announcements & Promotional Posters
router.get('/command-center/announcements', (req: AuthenticatedRequest, res: Response) => {
  const announcements = db.getAnnouncements();
  res.json({ announcements });
});

router.post('/command-center/announcements', (req: AuthenticatedRequest, res: Response) => {
  const {
    title,
    body,
    targetAudience,
    division,
    priority,
    bannerType,
    badgeText,
    imageUrl,
    posterUrl,
    actionUrl,
    actionLabel,
    expiresAt,
  } = req.body;

  if (!title || !body) {
    res.status(400).json({ error: 'Announcement title and body are required.' });
    return;
  }

  const announcement: Announcement = {
    id: crypto.randomUUID(),
    title: title.trim(),
    body: body.trim(),
    targetAudience: targetAudience || 'ALL',
    division: division || 'ALL',
    priority: priority || 'NORMAL',
    bannerType: bannerType || 'ANNOUNCEMENT',
    badgeText: badgeText ? badgeText.trim() : undefined,
    imageUrl: imageUrl ? imageUrl.trim() : undefined,
    posterUrl: posterUrl ? posterUrl.trim() : undefined,
    actionUrl: actionUrl ? actionUrl.trim() : undefined,
    actionLabel: actionLabel ? actionLabel.trim() : undefined,
    isActive: true,
    expiresAt,
    createdAt: new Date().toISOString(),
  };

  db.addAnnouncement(announcement);

  // Deliver real-time notification to targeted users
  const allUsers = db.getUsers();
  for (const user of allUsers) {
    if (user.role === 'ADMIN') continue;
    let match = false;
    if (announcement.targetAudience === 'ALL') match = true;
    else if (announcement.targetAudience === user.role) match = true;

    if (match) {
      db.addNotification({
        id: crypto.randomUUID(),
        userId: user.id,
        title: `TaskHub Announcement: ${announcement.title}`,
        message: announcement.body,
        type: announcement.priority === 'URGENT' ? 'ALERT' : 'INFO',
        link: announcement.actionUrl,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  res.status(201).json({
    message: 'Announcement & promotional poster broadcast successfully across TaskHub.',
    announcement,
  });
});

router.delete('/command-center/announcements/:id', (req: AuthenticatedRequest, res: Response) => {
  const removed = db.removeAnnouncement(req.params.id);
  if (!removed) {
    res.status(404).json({ error: 'Announcement not found.' });
    return;
  }
  res.json({ message: 'Announcement removed successfully.' });
});

router.patch('/command-center/announcements/:id/toggle', (req: AuthenticatedRequest, res: Response) => {
  const updated = db.toggleAnnouncement(req.params.id);
  if (!updated) {
    res.status(404).json({ error: 'Announcement not found.' });
    return;
  }
  res.json({ message: `Announcement set to ${updated.isActive ? 'Active' : 'Inactive'}.`, announcement: updated });
});

// 14. Admin Disputes Arbitration
router.get('/disputes', (req: AuthenticatedRequest, res: Response) => {
  const disputes = db.getDisputes();
  res.json({ disputes });
});

router.post('/disputes/:id/resolve', (req: AuthenticatedRequest, res: Response) => {
  const dispute = db.findDisputeById(req.params.id);
  if (!dispute) {
    res.status(404).json({ error: 'Dispute not found.' });
    return;
  }

  const { decision, adminNotes, refundAmount } = req.body;
  // decision: 'REFUND_SEEKER' | 'RELEASE_TO_PARTNER' | 'REJECT'
  if (!decision) {
    res.status(400).json({ error: 'Decision (REFUND_SEEKER, RELEASE_TO_PARTNER, REJECT) is required.' });
    return;
  }

  dispute.resolutionStatus = decision === 'REFUND_SEEKER'
    ? 'RESOLVED_REFUND'
    : decision === 'RELEASE_TO_PARTNER'
    ? 'RESOLVED_RELEASE'
    : 'REJECTED';
  dispute.adminNotes = adminNotes;
  dispute.resolvedAt = new Date().toISOString();
  dispute.resolvedBy = req.user!.id;
  dispute.refundAmount = refundAmount ? parseFloat(refundAmount) : 0;

  // Handle escrow disposition on booking
  if (dispute.bookingId) {
    const booking = db.findBookingById(dispute.bookingId);
    if (booking) {
      if (decision === 'REFUND_SEEKER') {
        booking.paymentStatus = 'REFUNDED';
        booking.status = 'CANCELLED';
        // Remove from tech partner pending escrow
        const techWallet = db.getOrCreateWallet(booking.techPartnerId);
        techWallet.escrowPendingAmount = Math.max(0, techWallet.escrowPendingAmount - booking.servicePrice);
        db.updateWallet(booking.techPartnerId, techWallet);
      } else if (decision === 'RELEASE_TO_PARTNER') {
        booking.paymentStatus = 'RELEASED_TO_PARTNER';
        booking.status = 'COMPLETED';
        const techWallet = db.getOrCreateWallet(booking.techPartnerId);
        techWallet.escrowPendingAmount = Math.max(0, techWallet.escrowPendingAmount - booking.servicePrice);
        techWallet.availableWithdrawableBalance = Math.round((techWallet.availableWithdrawableBalance + booking.servicePrice) * 100) / 100;
        db.updateWallet(booking.techPartnerId, techWallet);
      }
    }
  }

  db.save();

  res.json({ message: 'Dispute resolved.', dispute });
});

// 15. Master Admin Commission & Brokerage Controls
router.get('/settings/commission', (req: AuthenticatedRequest, res: Response) => {
  const settings = db.getPlatformSettings();
  res.json({ settings });
});

router.put('/settings/commission', (req: AuthenticatedRequest, res: Response) => {
  const {
    microGigTier1MaxMembers,
    microGigTier1FeePercentage,
    microGigTier2FeePercentage,
    localServiceCommissionPercentage,
  } = req.body;

  const updates: Partial<typeof req.body> = {};

  if (microGigTier1MaxMembers !== undefined) {
    const val = parseInt(String(microGigTier1MaxMembers), 10);
    if (isNaN(val) || val < 1 || val > 100) {
      res.status(400).json({ error: 'Tier 1 members threshold must be between 1 and 100.' });
      return;
    }
    updates.microGigTier1MaxMembers = val;
  }

  if (microGigTier1FeePercentage !== undefined) {
    const val = parseFloat(String(microGigTier1FeePercentage));
    if (isNaN(val) || val < 0 || val > 50) {
      res.status(400).json({ error: 'Tier 1 fee percentage must be between 0% and 50%.' });
      return;
    }
    updates.microGigTier1FeePercentage = Math.round(val * 10) / 10;
  }

  if (microGigTier2FeePercentage !== undefined) {
    const val = parseFloat(String(microGigTier2FeePercentage));
    if (isNaN(val) || val < 0 || val > 50) {
      res.status(400).json({ error: 'Tier 2 bulk fee percentage must be between 0% and 50%.' });
      return;
    }
    updates.microGigTier2FeePercentage = Math.round(val * 10) / 10;
  }

  if (localServiceCommissionPercentage !== undefined) {
    const val = parseFloat(String(localServiceCommissionPercentage));
    if (isNaN(val) || val < 0 || val > 50) {
      res.status(400).json({ error: 'Local service commission percentage must be between 0% and 50%.' });
      return;
    }
    updates.localServiceCommissionPercentage = Math.round(val * 10) / 10;
  }

  const updatedSettings = db.updatePlatformSettings(updates, req.user?.email || 'Master Admin');

  // Also update all existing DRAFT or future published gigs if applicable
  res.json({
    message: 'Platform commission and brokerage structure successfully updated.',
    settings: updatedSettings,
  });
});

export default router;
