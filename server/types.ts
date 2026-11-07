export type UserRole = 'GIG_HOST' | 'GIG_PARTNER' | 'SERVICE_SEEKER' | 'TECH_PARTNER' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';
export type GigStatus = 'DRAFT' | 'PUBLISHED' | 'FILLED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WAITLISTED' | 'CANCELLED';
export type AttendanceStatus = 'NOT_STARTED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'DISPUTED' | 'APPROVED' | 'REJECTED';
export type BookingStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'IN_PROGRESS' | 'AWAITING_BALANCE_TOPUP' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
export type PaymentStatus = 'PENDING' | 'ESCROW_LOCKED' | 'BALANCE_PENDING' | 'RELEASED_TO_PARTNER' | 'REFUNDED' | 'DISPUTED' | 'FAILED';
export type PaymentMethod = 'UPI' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'NET_BANKING';
export type WithdrawalStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REJECTED';

export interface User {
  id: string;
  email: string;
  mobile: string;
  fullName: string;
  passwordHash: string;
  role: UserRole;
  status: AccountStatus;
  emailVerified: boolean;
  mobileVerified: boolean;
  profileImageUrl?: string;
  avatarUrl?: string;
  bio?: string;
  preferredLocation?: string;
  rating: number;
  totalReviews: number;
  suspensionReason?: string;
  suspendedAt?: string;
  suspendedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OTPRecord {
  id: string;
  target: string;
  channel: 'EMAIL' | 'SMS';
  otpCode: string;
  attempts: number;
  isUsed: boolean;
  expiresAt: number;
  lastSentAt: number;
  createdAt: number;
}

export interface SessionRecord {
  token: string;
  userId: string;
  role: UserRole;
  createdAt: number;
  expiresAt: number;
}

export interface Gig {
  id: string;
  hostId: string;
  hostName: string;
  title: string;
  description: string;
  category: string;
  customCategory?: string;
  employmentType: string;
  requiredSkills: string;
  requiredWorkers: number;
  confirmedWorkers: number;
  workDate: string;
  shiftStartTime: string;
  shiftEndTime: string;
  customDuration: string;
  paymentAmount: number;
  paymentBasis: string;
  requiredExperience?: string;
  workLocation: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
  additionalInstructions?: string;
  applicationDeadline?: string;
  isFlexiStaff: boolean;
  flexiStaffDurationMonths?: number;
  flexiStaffFeePercentage?: number;
  platformFee: number;
  platformCommission?: number;
  platformBrokerageRate?: number;
  netPayoutAmount?: number;
  totalEscrowAmount?: number;
  escrowStatus?: 'PENDING_DEPOSIT' | 'ESCROW_LOCKED' | 'PARTIALLY_RELEASED' | 'ESCROW_RELEASED' | 'REFUNDED';
  escrowTransactionId?: string;
  escrowPaymentMethod?: string;
  escrowPaidAt?: string;
  termsAndConditions?: string;
  status: GigStatus;
  distanceKm?: number;
  completedAt?: string;
  hostApprovedAt?: string;
  createdAt: string;
  updatedAt: string;
  isLocked?: boolean;
  lockReason?: string;
  applicationsCount?: number;
  confirmedWorkersCount?: number;
}

export interface PlatformSettings {
  microGigTier1MaxMembers: number; // default: 5 (1 to 5 members)
  microGigTier1FeePercentage: number; // default: 10%
  microGigTier2FeePercentage: number; // default: 5% (above 5 members bulk)
  localServiceCommissionPercentage: number; // default: 10%
  updatedAt?: string;
  updatedBy?: string;
}

export interface GangMemberInfo {
  name: string;
  mobile?: string;
}

export interface DesignatedPayoutAccount {
  upiId?: string;
  bankAccount?: string;
  ifsc?: string;
  accountHolder?: string;
}

export interface GigApplication {
  id: string;
  gigId: string;
  partnerId: string;
  partnerName: string;
  partnerMobile: string;
  partnerEmail: string;
  bookingType?: 'INDIVIDUAL' | 'REFERRAL_GANG';
  gangId?: string;
  gangName?: string;
  gangCount?: number;
  gangMembers?: GangMemberInfo[];
  designatedPayoutAccount?: DesignatedPayoutAccount;
  status: ApplicationStatus;
  isWaitlisted: boolean;
  waitlistPosition?: number;
  appliedAt: string;
  reviewedAt?: string;
  notes?: string;
  isContactUnlocked?: boolean;
}

export interface GigAttendance {
  id: string;
  gigId: string;
  partnerId: string;
  partnerName: string;
  bookingType?: 'INDIVIDUAL' | 'REFERRAL_GANG';
  gangId?: string;
  gangName?: string;
  gangCount?: number;
  gangMembers?: GangMemberInfo[];
  designatedPayoutAccount?: DesignatedPayoutAccount;
  consolidatedPayoutAmount?: number;
  checkInTime?: string;
  checkInLat?: number;
  checkInLng?: number;
  checkOutTime?: string;
  checkOutLat?: number;
  checkOutLng?: number;
  distanceCheckInMeters?: number;
  distanceCheckOutMeters?: number;
  status: AttendanceStatus;
  exceptionNotes?: string;
  hostApproved: boolean;
  approvalDeadline?: string;
  disputeReason?: string;
  rejectionReason?: string;
  claimedDuration?: string;
  workNotes?: string;
  escrowStatus?: 'ESCROW_LOCKED' | 'ESCROW_RELEASED';
  approvedAt?: string;
  rejectedAt?: string;
  createdAt: string;
}

export interface GigApprovalItem {
  id: string;
  gigId: string;
  gigTitle: string;
  workLocation: string;
  workDate: string;
  partnerId: string;
  partnerName: string;
  bookingType?: 'INDIVIDUAL' | 'REFERRAL_GANG';
  gangId?: string;
  gangName?: string;
  gangCount?: number;
  gangMembers?: GangMemberInfo[];
  designatedPayoutAccount?: DesignatedPayoutAccount;
  consolidatedPayoutAmount?: number;
  checkInTime?: string;
  checkOutTime?: string;
  distanceCheckInMeters?: number;
  claimedDuration?: string;
  workNotes?: string;
  paymentAmount: number;
  paymentBasis: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  approvalDeadline?: string;
  approvedAt?: string;
  rejectedAt?: string;
  createdAt: string;
}

export interface ServiceListing {
  id: string;
  techPartnerId: string;
  techPartnerName: string;
  techPartnerMobile: string;
  techPartnerEmail?: string;
  techPartnerRating: number;
  techPartnerTotalReviews?: number;
  title: string;
  category: string;
  customCategory?: string;
  description: string;
  pricingBasis: 'Half-Day' | 'Full-Day' | 'Custom Duration' | 'Hourly';
  price: number;
  halfDayPrice?: number;
  fullDayPrice?: number;
  overtimeHourlyRate?: number;
  customDuration?: string;
  customChargesBreakdown?: Array<{ item: string; amount: number; description?: string }>;
  serviceAreaCoverage: string;
  serviceArea?: string;
  pinnedAddress?: string;
  serviceAddress?: string;
  latitude: number;
  longitude: number;
  // Pin-Based Map Radar (20–25 km operational radius)
  operatingRadiusKm: number;
  // General Availability
  availableWorkingDays?: string[];
  availableTimeSlots?: string[];
  operatingHoursStart?: string;
  operatingHoursEnd?: string;
  experienceYears?: string;
  qualifications?: string;
  skills?: string;
  conditions?: string;
  isActive: boolean;
  distanceKm?: number;
  isLocked?: boolean;
  lockReason?: string;
  activeBookingsCount?: number;
  totalBookingsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceBooking {
  id: string;
  serviceId: string;
  serviceTitle: string;
  category: string;
  customCategory?: string;
  seekerId: string;
  seekerName: string;
  seekerMobile: string;
  techPartnerId: string;
  techPartnerName: string;
  techPartnerMobile: string;
  isContactMasked?: boolean;
  serviceDate: string;
  preferredTime: string;
  duration: string;
  shiftType?: 'Duration-Based' | 'Hourly Basis' | 'Half-Day Shift' | 'Full-Day Shift' | string;
  shiftSlot?: string;
  baseDurationHours?: number;
  hourlyRate?: number;
  halfDayPrice?: number;
  fullDayPrice?: number;
  serviceLocation: string;
  serviceAddress: string;
  latitude?: number;
  longitude?: number;
  customerInstructions?: string;
  servicePrice: number;
  baseEscrowAmount: number;
  platformFee: number;
  applicableTaxes: number;
  totalPayableAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  escrowLockedAt?: string;
  status: BookingStatus;
  checkInTime?: string;
  checkInLatitude?: number;
  checkInLongitude?: number;
  checkInDistanceMeters?: number;
  checkOutTime?: string;
  checkOutLatitude?: number;
  checkOutLongitude?: number;
  checkOutDistanceMeters?: number;
  loggedDurationMinutes?: number;
  loggedDurationHours?: number;
  extensionChoice?: 'STANDARD' | 'EXTRA_HOURS' | 'SHIFT_EXTENSION';
  extraHoursWorked?: number;
  customHourlyRate?: number;
  shiftExtensionType?: 'FULL_DAY' | 'SECOND_HALF_DAY';
  workNotes?: string;
  overtimeHours?: number;
  overtimeAmount?: number;
  isExtended?: boolean;
  extensionType?: 'FULL_DAY' | 'ADDITIONAL_HOURS' | 'EXTRA_TASKS' | 'EXTRA_HOURS' | 'SHIFT_EXTENSION' | string;
  extensionReason?: string;
  postpaidBalanceAmount?: number;
  postpaidBalancePaid?: boolean;
  postpaidBalancePaidAt?: string;
  postpaidBalanceTxnId?: string;
  postpaidBalanceMethod?: string;
  totalSettledAmount?: number;
  customerApproved: boolean;
  customerApprovedAt?: string;
  isContactUnlocked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialLedgerEntry {
  id: string;
  transactionId: string;
  division: 'MICRO_GIG' | 'LOCAL_SERVICE';
  gigId?: string;
  bookingId?: string;
  title: string;
  payerId: string;
  payerName: string;
  payeeId: string;
  payeeName: string;
  grossAmount: number;
  platformFee: number;
  applicableTaxes: number;
  netPartnerAmount: number;
  paymentProvider: string;
  paymentReference: string;
  escrowStatus: PaymentStatus;
  lockTimestamp?: string;
  releaseTimestamp?: string;
  refundTimestamp?: string;
  isDisputed: boolean;
  notes?: string;
  createdAt: string;
}

export interface PartnerWallet {
  userId: string;
  grossEarnings: number;
  escrowPendingAmount: number;
  availableWithdrawableBalance: number;
  totalWithdrawn: number;
  updatedAt: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  amount: number;
  fee: number;
  netPayout: number;
  payoutMode: string;
  payoutDetails: string;
  status: WithdrawalStatus;
  transactionReference?: string;
  failureReason?: string;
  requestedAt: string;
  processedAt?: string;
}

export interface Dispute {
  id: string;
  division: 'MICRO_GIG' | 'LOCAL_SERVICE';
  gigId?: string;
  bookingId?: string;
  raisedBy: string;
  raisedByName: string;
  againstUserId: string;
  againstUserName: string;
  reasonCategory: string;
  description: string;
  evidenceUrls: string[];
  resolutionStatus: 'OPEN' | 'RESOLVED_REFUND' | 'RESOLVED_RELEASE' | 'REJECTED';
  adminNotes?: string;
  refundAmount: number;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  targetAudience: 'ALL' | 'GIG_HOST' | 'GIG_PARTNER' | 'SERVICE_SEEKER' | 'TECH_PARTNER' | string;
  division?: 'ALL' | 'MICRO_GIG' | 'LOCAL_SERVICE' | string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  bannerType?: 'PROMOTIONAL_POSTER' | 'ANNOUNCEMENT' | 'SYSTEM_UPDATE' | string;
  badgeText?: string;
  imageUrl?: string;
  posterUrl?: string;
  actionUrl?: string;
  actionLabel?: string;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface DelayedApprovalWarning {
  gigId: string;
  gigTitle: string;
  hostId: string;
  hostName: string;
  hostEmail: string;
  partnerId: string;
  partnerName: string;
  completionTime: string;
  approvalDeadline: string;
  hoursDelayed: number;
  reminderSentCount: number;
  lastReminderSentAt?: string;
}

export interface Review {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: UserRole;
  revieweeId: string;
  revieweeName: string;
  revieweeRole: UserRole;
  division: 'MICRO_GIG' | 'LOCAL_SERVICE';
  gigId?: string;
  bookingId?: string;
  jobTitle?: string;
  rating: number; // 1 to 5 integer
  comment: string;
  createdAt: string;
}

export interface RatingBreakdown {
  averageRating: number;
  totalReviews: number;
  starCounts: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  starPercentages: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}
