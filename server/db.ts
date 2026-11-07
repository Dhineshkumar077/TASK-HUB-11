import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  User,
  Gig,
  GigApplication,
  GigAttendance,
  ServiceListing,
  ServiceBooking,
  FinancialLedgerEntry,
  PartnerWallet,
  Withdrawal,
  Dispute,
  Announcement,
  NotificationItem,
  SessionRecord,
  UserRole,
  Review,
  RatingBreakdown,
  PlatformSettings,
} from './types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'taskhub.json');

export interface DatabaseSchema {
  users: User[];
  sessions: SessionRecord[];
  gigs: Gig[];
  gigApplications: GigApplication[];
  gigAttendance: GigAttendance[];
  services: ServiceListing[];
  serviceBookings: ServiceBooking[];
  financialLedger: FinancialLedgerEntry[];
  wallets: PartnerWallet[];
  withdrawals: Withdrawal[];
  disputes: Dispute[];
  announcements: Announcement[];
  notifications: NotificationItem[];
  reviews: Review[];
  platformSettings?: PlatformSettings;
}

const emptyDatabase: DatabaseSchema = {
  users: [],
  sessions: [],
  gigs: [],
  gigApplications: [],
  gigAttendance: [],
  services: [],
  serviceBookings: [],
  financialLedger: [],
  wallets: [],
  withdrawals: [],
  disputes: [],
  announcements: [],
  notifications: [],
  reviews: [],
  platformSettings: {
    microGigTier1MaxMembers: 5,
    microGigTier1FeePercentage: 10,
    microGigTier2FeePercentage: 5,
    localServiceCommissionPercentage: 10,
  },
};

class Database {
  private data: DatabaseSchema;
  private listeners: Array<(event: { type: string; payload: any }) => void> = [];

  constructor() {
    this.data = this.load();

    const shouldResetProdState = process.env.NODE_ENV === 'production' || process.env.TASKHUB_RESET_DB === 'true';
    if (shouldResetProdState) {
      this.data = JSON.parse(JSON.stringify(emptyDatabase));
      this.save();
      return;
    }

    // Keep local development data clean, but never auto-provision a default admin user.
    // Production deploys must use a fresh first-time admin registration flow.
    this.save();
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error reading database file, initializing clean database:', err);
    }
    return JSON.parse(JSON.stringify(emptyDatabase));
  }

  public save(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Failed to commit database write:', err);
    }
  }

  // Event Broadcasting for SSE
  public subscribe(listener: (event: { type: string; payload: any }) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public broadcast(type: string, payload: any) {
    for (const listener of this.listeners) {
      try {
        listener({ type, payload });
      } catch (err) {
        console.error('SSE broadcast error:', err);
      }
    }
  }

  // --- Users & Sessions ---
  public getUsers(): User[] {
    return this.data.users;
  }

  public findUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public findUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserByMobile(mobile: string): User | undefined {
    return this.data.users.find((u) => u.mobile.replace(/\D/g, '') === mobile.replace(/\D/g, ''));
  }

  public addUser(user: User): void {
    this.data.users.push(user);
    // Initialize empty wallet
    if (user.role === 'TECH_PARTNER' || user.role === 'GIG_PARTNER') {
      this.getOrCreateWallet(user.id);
    }
    this.save();
    this.broadcast('USER_REGISTERED', { id: user.id, role: user.role, name: user.fullName });
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.findUserById(id);
    if (!user) return undefined;
    Object.assign(user, updates, { updatedAt: new Date().toISOString() });
    this.save();
    this.broadcast('USER_UPDATED', { id: user.id, status: user.status });
    return user;
  }

  public addSession(session: SessionRecord): void {
    this.data.sessions.push(session);
    this.save();
  }

  public findSession(token: string): SessionRecord | undefined {
    const now = Date.now();
    const session = this.data.sessions.find((s) => s.token === token && s.expiresAt > now);
    return session;
  }

  public removeSession(token: string): void {
    this.data.sessions = this.data.sessions.filter((s) => s.token !== token);
    this.save();
  }

  public removeSessionsForUser(userId: string): void {
    this.data.sessions = this.data.sessions.filter((s) => s.userId !== userId);
    this.save();
  }

  public getAdminCount(): number {
    return this.data.users.filter((u) => u.role === 'ADMIN').length;
  }

  public getPrimaryAdmin(): User | undefined {
    return this.data.users.find((u) => u.role === 'ADMIN');
  }

  // --- Wallets ---
  public getOrCreateWallet(userId: string): PartnerWallet {
    let wallet = this.data.wallets.find((w) => w.userId === userId);
    if (!wallet) {
      wallet = {
        userId,
        grossEarnings: 0,
        escrowPendingAmount: 0,
        availableWithdrawableBalance: 0,
        totalWithdrawn: 0,
        updatedAt: new Date().toISOString(),
      };
      this.data.wallets.push(wallet);
      this.save();
    }
    return wallet;
  }

  public updateWallet(userId: string, updates: Partial<PartnerWallet>): PartnerWallet {
    const wallet = this.getOrCreateWallet(userId);
    Object.assign(wallet, updates, { updatedAt: new Date().toISOString() });
    this.save();
    this.broadcast('WALLET_UPDATED', { userId, wallet });
    return wallet;
  }

  // --- Gigs ---
  public getGigs(): Gig[] {
    return this.data.gigs;
  }

  public findGigById(id: string): Gig | undefined {
    return this.data.gigs.find((g) => g.id === id);
  }

  public addGig(gig: Gig): void {
    this.data.gigs.unshift(gig);
    this.save();
    this.broadcast('GIG_CREATED', gig);
  }

  public updateGig(id: string, updates: Partial<Gig>): Gig | undefined {
    const gig = this.findGigById(id);
    if (!gig) return undefined;
    Object.assign(gig, updates, { updatedAt: new Date().toISOString() });
    this.save();
    this.broadcast('GIG_UPDATED', gig);
    return gig;
  }

  // --- Gig Applications & Waiting List ---
  public getGigApplications(gigId?: string): GigApplication[] {
    if (gigId) {
      return this.data.gigApplications.filter((a) => a.gigId === gigId);
    }
    return this.data.gigApplications;
  }

  public getApplicationsByPartner(partnerId: string): GigApplication[] {
    return this.data.gigApplications.filter((a) => a.partnerId === partnerId);
  }

  public findApplication(gigId: string, partnerId: string): GigApplication | undefined {
    return this.data.gigApplications.find((a) => a.gigId === gigId && a.partnerId === partnerId);
  }

  public addGigApplication(app: GigApplication): void {
    this.data.gigApplications.push(app);
    this.save();
    this.broadcast('APPLICATION_SUBMITTED', app);
  }

  public updateGigApplication(id: string, updates: Partial<GigApplication>): GigApplication | undefined {
    const app = this.data.gigApplications.find((a) => a.id === id);
    if (!app) return undefined;
    Object.assign(app, updates);
    this.save();
    this.broadcast('APPLICATION_UPDATED', app);
    return app;
  }

  // Auto-promote next waitlisted participant when a slot frees up
  public promoteNextWaitlisted(gigId: string): GigApplication | null {
    const waitlisted = this.data.gigApplications
      .filter((a) => a.gigId === gigId && a.isWaitlisted && a.status === 'WAITLISTED')
      .sort((a, b) => (a.waitlistPosition || 0) - (b.waitlistPosition || 0));

    if (waitlisted.length === 0) return null;

    const nextCandidate = waitlisted[0];
    nextCandidate.isWaitlisted = false;
    nextCandidate.waitlistPosition = undefined;
    nextCandidate.status = 'APPROVED';
    nextCandidate.reviewedAt = new Date().toISOString();

    // Re-index remaining waitlist positions
    const remaining = waitlisted.slice(1);
    remaining.forEach((cand, idx) => {
      cand.waitlistPosition = idx + 1;
    });

    // Increment confirmed workers on gig
    const gig = this.findGigById(gigId);
    if (gig) {
      gig.confirmedWorkers = (gig.confirmedWorkers || 0) + 1;
      if (gig.confirmedWorkers >= gig.requiredWorkers) {
        gig.status = 'FILLED';
      }
    }

    this.save();
    this.broadcast('WAITLIST_PROMOTED', { gigId, promoted: nextCandidate });
    return nextCandidate;
  }

  // --- Gig Attendance ---
  public getGigAttendance(gigId?: string): GigAttendance[] {
    if (gigId) {
      return this.data.gigAttendance.filter((a) => a.gigId === gigId);
    }
    return this.data.gigAttendance;
  }

  public getAttendanceByPartner(partnerId: string): GigAttendance[] {
    return this.data.gigAttendance.filter((a) => a.partnerId === partnerId);
  }

  public findGigAttendance(gigId: string, partnerId: string): GigAttendance | undefined {
    return this.data.gigAttendance.find((a) => a.gigId === gigId && a.partnerId === partnerId);
  }

  public setGigAttendance(att: GigAttendance): void {
    const existingIndex = this.data.gigAttendance.findIndex(
      (a) => a.gigId === att.gigId && a.partnerId === att.partnerId
    );
    if (existingIndex >= 0) {
      this.data.gigAttendance[existingIndex] = att;
    } else {
      this.data.gigAttendance.push(att);
    }
    this.save();
    this.broadcast('ATTENDANCE_UPDATED', att);
  }

  // --- Services ---
  public getServices(): ServiceListing[] {
    return this.data.services;
  }

  public getServicesByTechPartner(techPartnerId: string): ServiceListing[] {
    return this.data.services.filter((s) => s.techPartnerId === techPartnerId);
  }

  public findServiceById(id: string): ServiceListing | undefined {
    return this.data.services.find((s) => s.id === id);
  }

  public addService(service: ServiceListing): void {
    this.data.services.unshift(service);
    this.save();
    this.broadcast('SERVICE_CREATED', service);
  }

  public updateService(id: string, updates: Partial<ServiceListing>): ServiceListing | undefined {
    const service = this.findServiceById(id);
    if (!service) return undefined;
    Object.assign(service, updates, { updatedAt: new Date().toISOString() });
    this.save();
    this.broadcast('SERVICE_UPDATED', service);
    return service;
  }

  public deleteService(id: string): boolean {
    const index = this.data.services.findIndex((s) => s.id === id);
    if (index === -1) return false;
    this.data.services.splice(index, 1);
    this.save();
    this.broadcast('SERVICE_DELETED', { id });
    return true;
  }

  // --- Bookings ---
  public getBookings(): ServiceBooking[] {
    return this.data.serviceBookings;
  }

  public getBookingsForTechPartner(techPartnerId: string): ServiceBooking[] {
    return this.data.serviceBookings.filter((b) => b.techPartnerId === techPartnerId);
  }

  public getBookingsBySeeker(seekerId: string): ServiceBooking[] {
    return this.data.serviceBookings.filter((b) => b.seekerId === seekerId);
  }

  public findBookingById(id: string): ServiceBooking | undefined {
    return this.data.serviceBookings.find((b) => b.id === id);
  }

  public addBooking(booking: ServiceBooking): void {
    this.data.serviceBookings.unshift(booking);
    this.save();
    this.broadcast('BOOKING_CREATED', booking);
  }

  public updateBooking(id: string, updates: Partial<ServiceBooking>): ServiceBooking | undefined {
    const booking = this.findBookingById(id);
    if (!booking) return undefined;
    Object.assign(booking, updates, { updatedAt: new Date().toISOString() });
    this.save();
    this.broadcast('BOOKING_UPDATED', booking);
    return booking;
  }

  // --- Financial Ledger ---
  public getFinancialLedger(): FinancialLedgerEntry[] {
    return this.data.financialLedger;
  }

  public addLedgerEntry(entry: FinancialLedgerEntry): void {
    this.data.financialLedger.unshift(entry);
    this.save();
    this.broadcast('LEDGER_ENTRY', entry);
  }

  public updateLedgerEntry(id: string, updates: Partial<FinancialLedgerEntry>): void {
    const entry = this.data.financialLedger.find((l) => l.id === id);
    if (entry) {
      Object.assign(entry, updates);
      this.save();
      this.broadcast('LEDGER_UPDATED', entry);
    }
  }

  // --- Withdrawals ---
  public getWithdrawals(): Withdrawal[] {
    return this.data.withdrawals;
  }

  public getWithdrawalsByPartner(partnerId: string): Withdrawal[] {
    return this.data.withdrawals.filter((w) => w.userId === partnerId);
  }

  public addWithdrawal(withdrawal: Withdrawal): void {
    this.data.withdrawals.unshift(withdrawal);
    this.save();
    this.broadcast('WITHDRAWAL_REQUESTED', withdrawal);
  }

  public updateWithdrawal(id: string, updates: Partial<Withdrawal>): Withdrawal | undefined {
    const item = this.data.withdrawals.find((w) => w.id === id);
    if (!item) return undefined;
    Object.assign(item, updates);
    this.save();
    this.broadcast('WITHDRAWAL_UPDATED', item);
    return item;
  }

  // --- Disputes ---
  public getDisputes(): Dispute[] {
    return this.data.disputes;
  }

  public findDisputeById(id: string): Dispute | undefined {
    return this.data.disputes.find((d) => d.id === id);
  }

  public addDispute(dispute: Dispute): void {
    this.data.disputes.unshift(dispute);
    this.save();
    this.broadcast('DISPUTE_RAISED', dispute);
  }

  public updateDispute(id: string, updates: Partial<Dispute>): Dispute | undefined {
    const item = this.findDisputeById(id);
    if (!item) return undefined;
    Object.assign(item, updates);
    this.save();
    this.broadcast('DISPUTE_UPDATED', item);
    return item;
  }

  // --- Announcements ---
  public getAnnouncements(): Announcement[] {
    return this.data.announcements;
  }

  public addAnnouncement(announcement: Announcement): void {
    this.data.announcements.unshift(announcement);
    this.save();
    this.broadcast('ANNOUNCEMENT_POSTED', announcement);
  }

  public removeAnnouncement(id: string): boolean {
    const idx = this.data.announcements.findIndex((a) => a.id === id);
    if (idx !== -1) {
      const removed = this.data.announcements.splice(idx, 1)[0];
      this.save();
      this.broadcast('ANNOUNCEMENT_REMOVED', removed);
      return true;
    }
    return false;
  }

  public toggleAnnouncement(id: string): Announcement | undefined {
    const ann = this.data.announcements.find((a) => a.id === id);
    if (ann) {
      ann.isActive = !ann.isActive;
      this.save();
      this.broadcast('ANNOUNCEMENT_UPDATED', ann);
      return ann;
    }
    return undefined;
  }

  // --- Notifications ---
  public getNotifications(userId: string): NotificationItem[] {
    return this.data.notifications.filter((n) => n.userId === userId);
  }

  public addNotification(notification: NotificationItem): void {
    this.data.notifications.unshift(notification);
    this.save();
    this.broadcast('NOTIFICATION_SENT', notification);
  }

  public markNotificationAsRead(id: string): void {
    const notif = this.data.notifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      this.save();
    }
  }

  public markAllNotificationsAsRead(userId: string): void {
    this.data.notifications.forEach((n) => {
      if (n.userId === userId) {
        n.isRead = true;
      }
    });
    this.save();
  }

  public clearNotifications(userId: string): void {
    this.data.notifications = this.data.notifications.filter((n) => n.userId !== userId);
    this.save();
  }

  // --- Universal Dynamic Rating & Review Engine (E-Commerce Style Aggregation) ---
  public getReviews(revieweeId?: string): Review[] {
    if (!this.data.reviews) this.data.reviews = [];
    if (revieweeId) {
      return this.data.reviews.filter((r) => r.revieweeId === revieweeId);
    }
    return this.data.reviews;
  }

  public findReview(reviewerId: string, revieweeId: string, gigId?: string, bookingId?: string): Review | undefined {
    if (!this.data.reviews) this.data.reviews = [];
    return this.data.reviews.find(
      (r) =>
        r.reviewerId === reviewerId &&
        r.revieweeId === revieweeId &&
        ((gigId && r.gigId === gigId) || (bookingId && r.bookingId === bookingId))
    );
  }

  public calculate_average_rating(userId: string): RatingBreakdown {
    if (!this.data.reviews) this.data.reviews = [];
    const userReviews = this.data.reviews.filter((r) => r.revieweeId === userId);
    const totalReviews = userReviews.length;
    const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (totalReviews === 0) {
      return {
        averageRating: 0.0,
        totalReviews: 0,
        starCounts,
        starPercentages: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    let sum = 0;
    for (const rev of userReviews) {
      const star = Math.max(1, Math.min(5, Math.round(rev.rating))) as 1 | 2 | 3 | 4 | 5;
      starCounts[star] = (starCounts[star] || 0) + 1;
      sum += rev.rating;
    }

    const rawAverage = sum / totalReviews;
    const averageRating = Math.round(rawAverage * 10) / 10;
    const starPercentages = {
      5: Math.round((starCounts[5] / totalReviews) * 100),
      4: Math.round((starCounts[4] / totalReviews) * 100),
      3: Math.round((starCounts[3] / totalReviews) * 100),
      2: Math.round((starCounts[2] / totalReviews) * 100),
      1: Math.round((starCounts[1] / totalReviews) * 100),
    };

    return {
      averageRating,
      totalReviews,
      starCounts,
      starPercentages,
    };
  }

  public addReview(review: Review): RatingBreakdown {
    if (!this.data.reviews) this.data.reviews = [];
    this.data.reviews.unshift(review);

    // Dynamic arithmetic mean aggregation
    const breakdown = this.calculate_average_rating(review.revieweeId);

    // Update reviewee user record
    const reviewee = this.findUserById(review.revieweeId);
    if (reviewee) {
      reviewee.rating = breakdown.averageRating;
      reviewee.totalReviews = breakdown.totalReviews;
    }

    // If reviewee is a Tech Partner, sync across all their services
    for (const service of this.data.services) {
      if (service.techPartnerId === review.revieweeId) {
        service.techPartnerRating = breakdown.averageRating;
        service.techPartnerTotalReviews = breakdown.totalReviews;
      }
    }

    this.save();
    this.broadcast('REVIEW_SUBMITTED', { review, breakdown });
    return breakdown;
  }

  // --- Platform Commission & Brokerage Controls ---
  public getPlatformSettings(): PlatformSettings {
    if (!this.data.platformSettings) {
      this.data.platformSettings = {
        microGigTier1MaxMembers: 5,
        microGigTier1FeePercentage: 10,
        microGigTier2FeePercentage: 5,
        localServiceCommissionPercentage: 10,
        updatedAt: new Date().toISOString(),
      };
      this.save();
    }
    return this.data.platformSettings;
  }

  public updatePlatformSettings(updates: Partial<PlatformSettings>, updatedBy?: string): PlatformSettings {
    const current = this.getPlatformSettings();
    this.data.platformSettings = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || current.updatedBy,
    };
    this.save();
    this.broadcast('PLATFORM_SETTINGS_UPDATED', this.data.platformSettings);
    return this.data.platformSettings;
  }

  public calculateGigBrokerage(
    paymentAmount: number,
    requiredWorkers: number,
    isFlexiStaff?: boolean,
    flexiStaffFeePercentage?: number
  ) {
    const settings = this.getPlatformSettings();
    const numWorkers = Math.max(1, parseInt(String(requiredWorkers), 10) || 1);
    const unitBudget = Math.max(0, parseFloat(String(paymentAmount)) || 0);
    const grossBudget = Math.round(unitBudget * numWorkers * 100) / 100;

    let tierRate = 10;
    if (isFlexiStaff && flexiStaffFeePercentage !== undefined && flexiStaffFeePercentage > 0) {
      tierRate = Math.min(25, Math.max(1, parseFloat(String(flexiStaffFeePercentage))));
    } else {
      const tier1Threshold = settings.microGigTier1MaxMembers || 5;
      if (numWorkers <= tier1Threshold) {
        tierRate = settings.microGigTier1FeePercentage ?? 10;
      } else {
        tierRate = settings.microGigTier2FeePercentage ?? 5;
      }
    }

    // Platform brokerage fee deducted from the Host's posted budget
    const platformFee = Math.round(((grossBudget * tierRate) / 100) * 100) / 100;
    // Net total worker payout pool (Total budget minus platform fee)
    const totalNetWorkerPool = Math.round((grossBudget - platformFee) * 100) / 100;
    // Unit net payout amount per worker/shift (displayed to partner)
    const netPayoutAmount = Math.round((unitBudget * (1 - tierRate / 100)) * 100) / 100;

    return {
      tierRate,
      platformFee,
      grossBudget,
      totalNetWorkerPool,
      netPayoutAmount,
    };
  }
}

export const db = new Database();
