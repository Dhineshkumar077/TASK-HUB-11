# TaskHub — Full-Stack Platform

**Micro-Gig Economy Platform + Collective Local Service Marketplace**

TaskHub is a unified enterprise platform combining:
1. **Micro-Gig Economy Platform** (for Gig Hosts & Gig Partners)
2. **Collective Local Service Marketplace** (for Service Seekers & Tech Partners)
3. **Master Admin Control Panel** (for Platform Governance, Financial Audit, and Command Center)

Built with React 19, TypeScript, Express, Tailwind CSS, Google Maps Geocoding/Geospatial calculations, Google GenAI SDK (Gemini 3.8 Flash), and real-time Server-Sent Events (SSE).

---

## 🏛️ System Architecture

```text
TASKHUB
│
├── 1. HOME (Two Primary Division Cards)
│
├── 2. MICRO-GIG ECONOMY PLATFORM
│   ├── GIG HOST PORTAL
│   │   ├── Independent Registration & Login (Email & SMS OTP)
│   │   ├── Host Dashboard (Metrics, Active Gigs, Confirmed Slots)
│   │   ├── Blank Post Gig Form (Gigs & 1-3 Mo FlexiStaff 5-10% Fee)
│   │   ├── Railway Waiting List Queue (#1, #2... with Auto-Promotion)
│   │   └── Geofenced Attendance Review & Payment Release
│   │
│   └── GIG PARTNER PORTAL
│       ├── Independent Registration & Login
│       ├── 20 km Geospatial Radar Discovery (Haversine Formula)
│       ├── Shift Applications & Railway Waitlist
│       ├── On-Site GPS Geofenced Check-In (<200m) & Check-Out
│       └── Wallet Earnings & Payout Ledger
│
├── 3. COLLECTIVE LOCAL SERVICE MARKETPLACE
│   ├── SERVICE SEEKER PORTAL
│   │   ├── Independent Registration & Login
│   │   ├── 20 km Nearby Tech Partner Radar (15 Categories + Others)
│   │   ├── Booking Wizard (Date, Slot, 8% Platform Fee + 18% Tax)
│   │   ├── Escrow Payment Gateway (UPI QR, Card, Net Banking)
│   │   └── My Bookings, Work Approval & Dispute Arbitration
│   │
│   └── TECH PARTNER PORTAL
│       ├── Independent Registration & Login
│       ├── Blank Create Service Form (15 Categories, Custom Pricing)
│       ├── Appointment Management & Customer Geofenced Check-In
│       └── Module 5.7 Dual Wallet Accounting:
│           ├── Wallet 1: Gross Earnings & Escrow Pending Funds
│           └── Wallet 2: Available Withdrawable Balance & Payouts
│
├── 4. MASTER ADMIN CONTROL PANEL
│   ├── Secure 10+ Character Password & 2FA Authentication
│   ├── Micro-Gig Economy Monitor (Directory, Job Monitor, Escrow Ledger)
│   ├── Delayed Host Approval Monitoring (>24h Warning Reminders)
│   ├── Local Service Marketplace Monitor (Listings, Bookings, Revenue)
│   └── Central Command Center (Targeted Broadcasts & Disputes)
│
└── 5. AI SUPPORT CHATBOT
    └── Context-Aware Domain Knowledge (Powered by Gemini 3.8 Flash SDK)
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm**
- (Optional) PostgreSQL 15+ if running production cloud database

### 2. Installation
Clone the repository or extract the project folder:
```bash
cd taskhub
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Key environment variables:
- `PORT=3000`: Development server port.
- `GEMINI_API_KEY`: Google Gemini API key for AI Support Chatbot.
- `VITE_API_BASE_URL=/api`: Frontend base URL for backend API calls.
- `GOOGLE_MAPS_API_KEY`: Optional Google Maps API key for geocoding and places.

> For production, do not pre-seed a default admin account. The initial live deployment must start with a fresh Master Admin registration flow.

### 4. Running the Full-Stack Server
Start the unified full-stack server (runs backend API routes and mounts Vite frontend middleware on port 3000):
```bash
npm run dev
```

Open your browser at:
```text
http://localhost:3000
```

---

## 🔐 Initial Master Admin Setup
On a clean production deployment, the platform starts without any pre-provisioned admin user and requires a first-time admin registration via the admin portal before any privileged access is available.

---

## 🗄️ Database Architecture & Migrations

TaskHub ships with two interchangeable database engines:
1. **Embedded ACID Transactional File Engine** (`server/db.ts`):
   - Automatically writes to `data/taskhub.json` using atomic temporary writes and file rename locks.
   - Works immediately out of the box with zero external setup.
   - Enforces relational constraints, duplicate checks, and event streams.
2. **PostgreSQL Enterprise Schema** (`db/schema.sql`):
   - Comprehensive SQL migration file with foreign keys, indexes, check constraints, enums, and geospatial indexes.
   - Run in your PostgreSQL instance:
     ```bash
     psql -U postgres -d taskhub_db -f db/schema.sql
     ```

---

## 🛡️ Core Functional Modules Verified

- **Module 1**: Exact two primary business division cards on homepage, routing to 4 autonomous portals.
- **Module 2**: Four separate registration pages with strictly **no role dropdown**. Email OTP and SMS OTP with cooldowns, rate limits, and live verification.
- **Module 3**: Gig Host portal with blank forms, 20 km radius search, FlexiStaff 1–3 month contracts (5–10% fee), and railway-style waiting lists with auto-promotion.
- **Module 4**: Gig Partner portal with 20 km radar discovery, application tracking, geofenced GPS check-in/out, and wallet earnings.
- **Module 5**: Tech Partner portal with 15 categories + Others, custom half-day/full-day pricing, geofenced customer check-in, and **Dual Wallet accounting system** (Wallet 1: Earnings & Pending Escrow; Wallet 2: Available Withdrawable Balance).
- **Module 6**: Service Seeker portal with 20 km discovery, verified escrow payment gateway (UPI, Cards, Net Banking), attendance tracking, work approval, and dispute arbitration.
- **Module 7, 8, 9, 10**: Master Admin Control Panel with 2FA, Micro-Gig and Local Service monitors, delayed approval warning dispatcher, and Command Center broadcasts.
- **Module 11**: Strict Zero Dummy Data policy. All forms start blank, metrics calculate from real database records, and clean empty states render when no entries exist.
- **Module 12**: Real-time cross-device synchronization via Server-Sent Events (`/api/events`).
- **Module 13**: AI Support Chatbot using `@google/genai` (Gemini 3.8 Flash) with role-aware guidance.

---

## 📦 Building for Production

To create an optimized production bundle:
```bash
npm run build
npm start
```
