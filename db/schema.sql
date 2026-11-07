-- ==============================================================================
-- TASKHUB ENTERPRISE DATABASE SCHEMA (POSTGRESQL 15+)
-- Micro-Gig Economy Platform + Collective Local Service Marketplace
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "earthdistance" CASCADE;

-- ENUMS
CREATE TYPE user_role AS ENUM ('GIG_HOST', 'GIG_PARTNER', 'SERVICE_SEEKER', 'TECH_PARTNER', 'ADMIN');
CREATE TYPE account_status AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION');
CREATE TYPE gig_status AS ENUM ('DRAFT', 'PUBLISHED', 'FILLED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE application_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WAITLISTED', 'CANCELLED');
CREATE TYPE attendance_status AS ENUM ('NOT_STARTED', 'CHECKED_IN', 'CHECKED_OUT', 'DISPUTED', 'APPROVED');
CREATE TYPE booking_status AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED');
CREATE TYPE payment_status AS ENUM ('PENDING', 'ESCROW_LOCKED', 'RELEASED_TO_PARTNER', 'REFUNDED', 'DISPUTED', 'FAILED');
CREATE TYPE payment_method AS ENUM ('UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'NET_BANKING');
CREATE TYPE withdrawal_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REJECTED');

-- 1. USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    mobile VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    status account_status DEFAULT 'ACTIVE',
    email_verified BOOLEAN DEFAULT FALSE,
    mobile_verified BOOLEAN DEFAULT FALSE,
    profile_image_url TEXT,
    bio TEXT,
    rating NUMERIC(3, 2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    suspension_reason TEXT,
    suspended_at TIMESTAMPTZ,
    suspended_by UUID,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. OTP VERIFICATIONS TABLE
CREATE TABLE otp_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target VARCHAR(255) NOT NULL,
    channel VARCHAR(10) NOT NULL CHECK (channel IN ('EMAIL', 'SMS')),
    otp_code VARCHAR(10) NOT NULL,
    attempts INT DEFAULT 0,
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. GIGS TABLE (Micro-Gig Economy)
CREATE TABLE gigs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    custom_category VARCHAR(100),
    employment_type VARCHAR(50) NOT NULL DEFAULT 'Temporary Shift',
    required_skills TEXT,
    required_workers INT NOT NULL CHECK (required_workers > 0),
    confirmed_workers INT DEFAULT 0,
    work_date DATE NOT NULL,
    shift_start_time TIME NOT NULL,
    shift_end_time TIME NOT NULL,
    custom_duration VARCHAR(100) NOT NULL,
    payment_amount NUMERIC(10, 2) NOT NULL CHECK (payment_amount > 0),
    payment_basis VARCHAR(50) NOT NULL DEFAULT 'Per Shift',
    required_experience VARCHAR(100),
    work_location VARCHAR(255) NOT NULL,
    full_address TEXT NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    geofence_radius_meters INT DEFAULT 200,
    additional_instructions TEXT,
    application_deadline TIMESTAMPTZ,
    is_flexistaff BOOLEAN DEFAULT FALSE,
    flexistaff_duration_months NUMERIC(3, 1),
    flexistaff_fee_percentage NUMERIC(4, 2) DEFAULT 7.50,
    platform_fee NUMERIC(10, 2) DEFAULT 0.00,
    terms_and_conditions TEXT,
    status gig_status DEFAULT 'PUBLISHED',
    completed_at TIMESTAMPTZ,
    host_approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. GIG APPLICATIONS & WAITING LIST TABLE
CREATE TABLE gig_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status application_status DEFAULT 'PENDING',
    is_waitlisted BOOLEAN DEFAULT FALSE,
    waitlist_position INT,
    applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    UNIQUE (gig_id, partner_id)
);

-- 5. GIG ATTENDANCE (Geofenced Check-In & Check-Out)
CREATE TABLE gig_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    check_in_time TIMESTAMPTZ,
    check_in_lat NUMERIC(10, 7),
    check_in_lng NUMERIC(10, 7),
    check_out_time TIMESTAMPTZ,
    check_out_lat NUMERIC(10, 7),
    check_out_lng NUMERIC(10, 7),
    distance_check_in_meters NUMERIC(8, 2),
    distance_check_out_meters NUMERIC(8, 2),
    status attendance_status DEFAULT 'NOT_STARTED',
    exception_notes TEXT,
    host_approved BOOLEAN DEFAULT FALSE,
    approval_deadline TIMESTAMPTZ,
    dispute_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (gig_id, partner_id)
);

-- 6. SERVICES TABLE (Collective Local Service Marketplace)
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tech_partner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    custom_category VARCHAR(100),
    description TEXT NOT NULL,
    pricing_basis VARCHAR(50) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    half_day_price NUMERIC(10, 2),
    full_day_price NUMERIC(10, 2),
    custom_duration VARCHAR(100),
    service_area VARCHAR(255) NOT NULL,
    service_address TEXT NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    available_working_days TEXT NOT NULL,
    available_time_slots TEXT NOT NULL,
    experience_years VARCHAR(50),
    qualifications TEXT,
    skills TEXT,
    conditions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. SERVICE BOOKINGS TABLE
CREATE TABLE service_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    seeker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tech_partner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_date DATE NOT NULL,
    preferred_time VARCHAR(50) NOT NULL,
    duration VARCHAR(50) NOT NULL,
    service_location VARCHAR(255) NOT NULL,
    service_address TEXT NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    customer_instructions TEXT,
    service_price NUMERIC(10, 2) NOT NULL,
    platform_fee NUMERIC(10, 2) NOT NULL,
    applicable_taxes NUMERIC(10, 2) NOT NULL,
    total_payable_amount NUMERIC(10, 2) NOT NULL,
    payment_status payment_status DEFAULT 'PENDING',
    payment_method payment_method,
    payment_reference VARCHAR(150),
    escrow_locked_at TIMESTAMPTZ,
    status booking_status DEFAULT 'PENDING_PAYMENT',
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    customer_approved BOOLEAN DEFAULT FALSE,
    customer_approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. ACCOUNTANT ESCROW & FINANCIAL LEDGER
CREATE TABLE financial_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    division VARCHAR(50) NOT NULL CHECK (division IN ('MICRO_GIG', 'LOCAL_SERVICE')),
    gig_id UUID REFERENCES gigs(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES service_bookings(id) ON DELETE SET NULL,
    payer_id UUID NOT NULL REFERENCES users(id),
    payee_id UUID NOT NULL REFERENCES users(id),
    gross_amount NUMERIC(10, 2) NOT NULL,
    platform_fee NUMERIC(10, 2) NOT NULL,
    applicable_taxes NUMERIC(10, 2) NOT NULL,
    net_partner_amount NUMERIC(10, 2) NOT NULL,
    payment_provider VARCHAR(50) DEFAULT 'RAZORPAY_ESCROW',
    payment_reference VARCHAR(150),
    escrow_status payment_status NOT NULL,
    lock_timestamp TIMESTAMPTZ,
    release_timestamp TIMESTAMPTZ,
    refund_timestamp TIMESTAMPTZ,
    is_disputed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. TECH PARTNER & GIG PARTNER WALLETS
CREATE TABLE partner_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gross_earnings NUMERIC(10, 2) DEFAULT 0.00,
    escrow_pending_amount NUMERIC(10, 2) DEFAULT 0.00,
    available_withdrawable_balance NUMERIC(10, 2) DEFAULT 0.00,
    total_withdrawn NUMERIC(10, 2) DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. WITHDRAWALS TABLE
CREATE TABLE withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    fee NUMERIC(10, 2) DEFAULT 0.00,
    net_payout NUMERIC(10, 2) NOT NULL,
    payout_mode VARCHAR(50) NOT NULL,
    payout_details TEXT NOT NULL,
    status withdrawal_status DEFAULT 'PENDING',
    transaction_reference VARCHAR(150),
    failure_reason TEXT,
    requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ
);

-- 11. DISPUTES TABLE
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    division VARCHAR(50) NOT NULL,
    gig_id UUID REFERENCES gigs(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES service_bookings(id) ON DELETE SET NULL,
    raised_by UUID NOT NULL REFERENCES users(id),
    against_user_id UUID NOT NULL REFERENCES users(id),
    reason_category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    evidence_urls TEXT[],
    resolution_status VARCHAR(50) DEFAULT 'OPEN',
    admin_notes TEXT,
    refund_amount NUMERIC(10, 2) DEFAULT 0.00,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 12. GLOBAL ANNOUNCEMENTS & COMMAND CENTER
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    target_audience VARCHAR(50) NOT NULL DEFAULT 'ALL',
    division VARCHAR(50) DEFAULT 'ALL',
    priority VARCHAR(20) DEFAULT 'NORMAL',
    action_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 13. NOTIFICATIONS TABLE
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    link VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 14. RATINGS & REVIEWS
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reviewer_id UUID NOT NULL REFERENCES users(id),
    reviewee_id UUID NOT NULL REFERENCES users(id),
    division VARCHAR(50) NOT NULL,
    gig_id UUID REFERENCES gigs(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES service_bookings(id) ON DELETE SET NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR 20 KM GEOSPATIAL SEARCH
CREATE INDEX idx_gigs_coordinates ON gigs (latitude, longitude);
CREATE INDEX idx_services_coordinates ON services (latitude, longitude);
CREATE INDEX idx_gigs_status ON gigs (status);
CREATE INDEX idx_services_active ON services (is_active);
CREATE INDEX idx_ledger_division ON financial_ledger (division, escrow_status);
CREATE INDEX idx_applications_gig ON gig_applications (gig_id, status);
CREATE INDEX idx_notifications_user ON notifications (user_id, is_read);
