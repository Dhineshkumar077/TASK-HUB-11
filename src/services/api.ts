const rawApiBase = (import.meta.env.VITE_API_BASE_URL ?? '/api').trim();
const API_BASE = rawApiBase.replace(/\/$/, '');

export function getAuthToken(): string | null {
  return localStorage.getItem('taskhub_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('taskhub_token', token);
}

export function clearAuthToken(): void {
  localStorage.removeItem('taskhub_token');
}

export function clearPersistedSessionState(): void {
  clearAuthToken();
  localStorage.removeItem('taskhub_live_gps');
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (err: any) {
    // Graceful offline or server restart handling
    throw new Error(err.message || 'Network request failed. Please check your connection.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  sendOtp: (target: string, channel: 'EMAIL' | 'SMS') =>
    apiRequest('/auth/send-otp', { method: 'POST', body: JSON.stringify({ target, channel }) }),
  verifyOtp: (target: string, channel: 'EMAIL' | 'SMS', code: string) =>
    apiRequest('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ target, channel, code }) }),
  register: (roleParam: string, payload: any) =>
    apiRequest(`/auth/register/${roleParam}`, { method: 'POST', body: JSON.stringify(payload) }),
  login: (roleParam: string, payload: any) =>
    apiRequest(`/auth/login/${roleParam}`, { method: 'POST', body: JSON.stringify(payload) }),
  adminLogin: (payload: any) =>
    apiRequest('/auth/admin-login', { method: 'POST', body: JSON.stringify(payload) }),
  sendAdmin2FA: (payload: { identifier?: string; channel?: 'EMAIL' | 'SMS' }) =>
    apiRequest('/auth/admin/send-2fa', { method: 'POST', body: JSON.stringify(payload) }),
  getAdminStatus: () => apiRequest('/auth/admin/status'),
  registerAdmin: (payload: any) =>
    apiRequest('/auth/admin/register', { method: 'POST', body: JSON.stringify(payload) }),
  requestAdminPasswordReset: (payload: { identifier: string; channel: 'EMAIL' | 'SMS' }) =>
    apiRequest('/auth/admin/forgot-password/request', { method: 'POST', body: JSON.stringify(payload) }),
  verifyAdminPasswordReset: (payload: {
    identifier: string;
    channel: 'EMAIL' | 'SMS';
    code: string;
    newPassword: string;
    confirmPassword: string;
  }) =>
    apiRequest('/auth/admin/forgot-password/verify-reset', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => apiRequest('/auth/me'),
  updateProfile: (payload: any) => apiRequest('/auth/profile', { method: 'PUT', body: JSON.stringify(payload) }),
  getUserHistory: () => apiRequest('/auth/history'),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),

  // Maps & Location
  geocodeAddress: (address: string) => apiRequest(`/maps/geocode?address=${encodeURIComponent(address)}`),
  reverseGeocode: (lat: number, lng: number) => apiRequest(`/maps/reverse-geocode?lat=${lat}&lng=${lng}`),
  autocompleteAddress: (input: string) => apiRequest(`/maps/autocomplete?input=${encodeURIComponent(input)}`),

  // Gigs
  getGigs: (params?: Record<string, any>) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/gigs${query ? `?${query}` : ''}`);
  },
  getMyGigs: () => apiRequest('/gigs/my'),
  getGigById: (id: string) => apiRequest(`/gigs/${id}`),
  createGig: (payload: any) => apiRequest('/gigs', { method: 'POST', body: JSON.stringify(payload) }),
  updateGig: (gigId: string, payload: any) =>
    apiRequest(`/gigs/${gigId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  bookGigSlot: (id: string, payload: { bookingType?: 'INDIVIDUAL' | 'REFERRAL_GANG'; gangName?: string; gangCount?: number; gangMembers?: any[]; designatedPayoutAccount?: any; notes?: string }) =>
    apiRequest(`/gigs/${id}/book-slot`, { method: 'POST', body: JSON.stringify(payload) }),
  applyGig: (id: string, notes?: string) =>
    apiRequest(`/gigs/${id}/apply`, { method: 'POST', body: JSON.stringify({ notes }) }),
  getMyGigBookings: () => {
    if (!getAuthToken()) return Promise.resolve({ bookings: [] });
    return apiRequest('/gigs/partner/my-bookings');
  },
  approveApplicant: (gigId: string, appId: string) =>
    apiRequest(`/gigs/${gigId}/applications/${appId}/approve`, { method: 'POST' }),
  rejectApplicant: (gigId: string, appId: string) =>
    apiRequest(`/gigs/${gigId}/applications/${appId}/reject`, { method: 'POST' }),
  cancelWorker: (gigId: string, partnerId: string) =>
    apiRequest(`/gigs/${gigId}/cancel-worker`, { method: 'POST', body: JSON.stringify({ partnerId }) }),
  checkInGig: (gigId: string, payload: { latitude?: number; longitude?: number; exceptionReason?: string; simulateOnSite?: boolean }) =>
    apiRequest(`/gigs/${gigId}/check-in`, { method: 'POST', body: JSON.stringify(payload) }),
  checkOutGig: (gigId: string, payload: { latitude?: number; longitude?: number; claimedDuration?: string; workNotes?: string }) =>
    apiRequest(`/gigs/${gigId}/check-out`, { method: 'POST', body: JSON.stringify(payload) }),
  approveGigWork: (gigId: string, partnerId: string) =>
    apiRequest(`/gigs/${gigId}/approve-work`, { method: 'POST', body: JSON.stringify({ partnerId }) }),
  rejectGigWork: (gigId: string, payload: { partnerId: string; reason: string }) =>
    apiRequest(`/gigs/${gigId}/reject-work`, { method: 'POST', body: JSON.stringify(payload) }),
  getHostApprovals: () => {
    if (!getAuthToken()) return Promise.resolve({ approvals: [] });
    return apiRequest('/gigs/host/approvals');
  },

  // Services
  getServices: (params?: Record<string, any>) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/services${query ? `?${query}` : ''}`);
  },
  getMyServices: () => {
    if (!getAuthToken()) return Promise.resolve({ services: [] });
    return apiRequest('/services/my');
  },
  getServiceById: (id: string) => apiRequest(`/services/${id}`),
  createService: (payload: any) => apiRequest('/services', { method: 'POST', body: JSON.stringify(payload) }),
  updateService: (serviceId: string, payload: any) =>
    apiRequest(`/services/${serviceId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  toggleServiceStatus: (serviceId: string) =>
    apiRequest(`/services/${serviceId}/toggle`, { method: 'PATCH' }),
  deleteService: (serviceId: string) =>
    apiRequest(`/services/${serviceId}`, { method: 'DELETE' }),
  bookService: (serviceId: string, payload: any) =>
    apiRequest(`/services/${serviceId}/book`, { method: 'POST', body: JSON.stringify(payload) }),
  payBooking: (bookingId: string, payload: { paymentMethod: string; paymentReference?: string }) =>
    apiRequest(`/services/bookings/${bookingId}/pay`, { method: 'POST', body: JSON.stringify(payload) }),
  checkInBooking: (bookingId: string, payload: { latitude?: number; longitude?: number }) =>
    apiRequest(`/services/bookings/${bookingId}/check-in`, { method: 'POST', body: JSON.stringify(payload) }),
  checkOutBooking: (
    bookingId: string,
    payload: {
      latitude?: number;
      longitude?: number;
      loggedHours?: number;
      extensionChoice?: 'STANDARD' | 'EXTRA_HOURS' | 'SHIFT_EXTENSION';
      extraHours?: number;
      customHourlyRate?: number;
      shiftExtensionType?: 'FULL_DAY' | 'SECOND_HALF_DAY';
      fullDayUpgradeAmount?: number;
      workNotes?: string;
    }
  ) => apiRequest(`/services/bookings/${bookingId}/check-out`, { method: 'POST', body: JSON.stringify(payload) }),
  payBookingBalance: (bookingId: string, payload: { paymentMethod: string; paymentReference?: string }) =>
    apiRequest(`/services/bookings/${bookingId}/pay-balance`, { method: 'POST', body: JSON.stringify(payload) }),
  approveBooking: (bookingId: string) =>
    apiRequest(`/services/bookings/${bookingId}/approve`, { method: 'POST' }),
  disputeBooking: (bookingId: string, payload: any) =>
    apiRequest(`/services/bookings/${bookingId}/dispute`, { method: 'POST', body: JSON.stringify(payload) }),
  getMyBookings: () => {
    if (!getAuthToken()) return Promise.resolve({ bookings: [] });
    return apiRequest('/services/my/bookings');
  },

  // Wallets
  getMyWallet: () => {
    if (!getAuthToken()) return Promise.resolve({ wallet: null });
    return apiRequest('/wallets/my');
  },
  withdrawFunds: (payload: { amount: number; payoutMode: string; payoutDetails: string }) =>
    apiRequest('/wallets/withdraw', { method: 'POST', body: JSON.stringify(payload) }),

  // Announcements & Notifications
  getAnnouncements: (role?: string) => apiRequest(`/announcements${role ? `?role=${role}` : ''}`),
  getNotifications: () => {
    if (!getAuthToken()) return Promise.resolve({ notifications: [] });
    return apiRequest('/notifications');
  },
  markNotificationRead: (id: string) => apiRequest(`/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => apiRequest('/notifications/read-all', { method: 'POST' }),
  clearNotifications: () => apiRequest('/notifications', { method: 'DELETE' }),

  // AI Support Chatbot
  askChatbot: (message: string, userRole?: string, userName?: string) =>
    apiRequest('/support-chatbot', { method: 'POST', body: JSON.stringify({ message, userRole, userName }) }),

  // Universal Dynamic Rating & Review Engine
  submitReview: (payload: { revieweeId: string; division: string; gigId?: string; bookingId?: string; rating: number; comment: string }) =>
    apiRequest('/reviews', { method: 'POST', body: JSON.stringify(payload) }),
  getUserReviews: (userId: string) => apiRequest(`/reviews/user/${userId}`),
  getPendingReviews: () => {
    if (!getAuthToken()) return Promise.resolve({ pending: [] });
    return apiRequest('/reviews/pending');
  },

  // Admin APIs
  getAdminOverview: () => apiRequest('/admin/overview'),
  getAdminMicroGigUsers: () => apiRequest('/admin/micro-gig/users'),
  updateUserStatus: (userId: string, payload: { status: string; reason?: string }) =>
    apiRequest(`/admin/users/${userId}/status`, { method: 'POST', body: JSON.stringify(payload) }),
  getAdminJobs: () => apiRequest('/admin/micro-gig/jobs'),
  getAdminDelayedApprovals: () => apiRequest('/admin/micro-gig/delayed-approvals'),
  sendDelayedReminder: (gigId: string, partnerId?: string) =>
    apiRequest(`/admin/micro-gig/delayed-approvals/${gigId}/send-reminder`, { method: 'POST', body: JSON.stringify({ partnerId }) }),
  getAdminEscrowLedger: () => apiRequest('/admin/micro-gig/escrow-ledger'),
  getAdminLocalUsers: () => apiRequest('/admin/local-service/users'),
  getAdminServices: () => apiRequest('/admin/local-service/services'),
  toggleAdminService: (id: string) => apiRequest(`/admin/local-service/services/${id}/toggle`, { method: 'POST' }),
  getAdminBookings: () => apiRequest('/admin/local-service/bookings'),
  getAdminRevenueReports: () => apiRequest('/admin/local-service/revenue-reports'),
  broadcastAnnouncement: (payload: any) => apiRequest('/admin/command-center/announcements', { method: 'POST', body: JSON.stringify(payload) }),
  getAdminAnnouncements: () => apiRequest('/admin/command-center/announcements'),
  deleteAdminAnnouncement: (id: string) => apiRequest(`/admin/command-center/announcements/${id}`, { method: 'DELETE' }),
  toggleAdminAnnouncement: (id: string) => apiRequest(`/admin/command-center/announcements/${id}/toggle`, { method: 'PATCH' }),
  getAdminDisputes: () => apiRequest('/admin/disputes'),
  resolveAdminDispute: (id: string, payload: any) =>
    apiRequest(`/admin/disputes/${id}/resolve`, { method: 'POST', body: JSON.stringify(payload) }),
  getCommissionSettings: () => apiRequest('/commission-settings'),
  getAdminCommissionSettings: () => apiRequest('/admin/settings/commission'),
  updateAdminCommissionSettings: (payload: any) =>
    apiRequest('/admin/settings/commission', { method: 'PUT', body: JSON.stringify(payload) }),
};
