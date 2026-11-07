import { GoogleGenAI } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

const SYSTEM_INSTRUCTION = `
You are the official TaskHub AI Support Assistant.
TaskHub is an integrated platform combining:
1. Micro-Gig Economy Platform (Gig Host & Gig Partner)
2. Collective Local Service Marketplace (Service Seeker & Tech Partner)

Core Policies and System Rules:
- Four independent portals with strict role permissions:
  * Gig Host: Creates temporary jobs, shifts, event staff requests, and 1-3 month FlexiStaff contracts (5-10% platform fee). Manages applicants, waiting lists, checks attendance, and approves payments upon work completion.
  * Gig Partner: Discovers gigs within a 10 to 15 km radius (default 10 km) via geospatial search. Applies or joins railway-style waiting lists. Performs geofenced check-in (<200m) and check-out on-site. Receives escrow-released payments into wallet.
  * Service Seeker: Discovers certified Tech Partners within a 10 to 15 km radius (default 10 km) for 15 service categories (Plumber, Electrician, AC Technician, Bike Mechanic, Carpenter, Painter, Appliance Repair, Washing Machine Repair, Refrigerator Repair, Computer/Laptop Repair, Cleaning Services, Home Maintenance, Installation Services, General Technician, Others). Books services with verified payments (UPI, Card, Net Banking) held securely in Escrow until completion approval.
  * Tech Partner: Sets custom prices (Half-Day, Full-Day, Hourly, Custom duration). Performs on-site geofenced check-in/out. Manages Dual Wallet accounting: (1) Earnings and Pending Escrow funds, (2) Available Withdrawable Balance. Requests verified payouts.
- Master Admin Control Panel: Provides supervision, delayed approval reminders, accountant escrow ledgers, command center broadcast announcements, and dispute arbitration.
- Financial Integrity: Funds are locked in Escrow upon booking or gig approval. Money is released only after customer/host approval or authorized dispute resolution. Dual wallet balances never mix pending funds with withdrawable balances.
- Geofencing: Check-in and check-out require mobile GPS validation within 200m of the work address. Exceptions require admin/host approval.

Chatbot Behavior Rules:
- Context-Awareness: Tailor your response directly to the user's current portal role (Gig Host, Gig Partner, Service Seeker, Tech Partner, or Guest).
- Be polite, concise, professional, and actionable.
- DO NOT claim to directly change wallet balances, release escrow, approve payments, or bypass authentication. Guide the user on how to perform these actions inside their portal.
`;

export async function askTaskHubSupportChatbot(
  query: string,
  userRole?: string,
  userName?: string
): Promise<string> {
  const client = getGeminiClient();
  
  const roleContext = userRole
    ? `User is currently logged in as: ${userRole}${userName ? ` (${userName})` : ''}.`
    : `User is currently an unauthenticated guest exploring TaskHub.`;

  if (client) {
    try {
      const response = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `${roleContext}\n\nUser Question: ${query}`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn('Gemini API call failed, falling back to intelligent knowledge base:', err?.message || err);
    }
  }

  // Fallback intelligent response engine if Gemini API key is missing or quota reached
  const q = query.toLowerCase();

  if (q.includes('fee') || q.includes('platform fee') || q.includes('commission')) {
    return 'TaskHub applies transparent platform fees:\n- Micro-Gigs: Minimal platform service fee calculated on payout.\n- FlexiStaff Contracts: Configurable 5% to 10% platform fee depending on contract duration (1-3 months).\n- Local Service Marketplace: Transparent fee clearly itemized on the booking invoice before customer checkout.';
  }

  if (q.includes('radius') || q.includes('distance') || q.includes('10 km') || q.includes('15 km') || q.includes('20 km') || q.includes('map')) {
    return 'TaskHub strictly enforces a 10 km to 15 km search radius (defaulting to 10 km) using geospatial coordinates (Haversine formula). Gig Partners see gigs within 10-15 km of their location, and Service Seekers discover Tech Partners operating within 10-15 km of their premises.';
  }

  if (q.includes('geofence') || q.includes('check-in') || q.includes('check-out') || q.includes('attendance')) {
    return 'Attendance is location-verified! When you arrive at the work site or customer address, click "Check-In". The system verifies that your GPS coordinates are within 200 meters of the job location. After completing work, perform "Check-Out" to trigger the completion approval notification.';
  }

  if (q.includes('waiting list') || q.includes('waitlist') || q.includes('queue') || q.includes('filled')) {
    return 'TaskHub features a railway-style waiting list. If a gig requires 10 workers and 10 positions are filled (10/10 Confirmed), new applicants automatically receive queue positions (#1, #2, etc.). If a confirmed worker cancels, the next waiting-list applicant is automatically promoted!';
  }

  if (q.includes('escrow') || q.includes('payment') || q.includes('release') || q.includes('wallet')) {
    return 'Financial integrity is guaranteed on TaskHub:\n1. Payments are locked safely in Escrow when a gig or service is booked.\n2. Escrowed funds are strictly separated from withdrawable balances.\n3. Upon verified check-out and customer/host approval, funds are released to your wallet earnings.\n4. Tech Partners can request verified bank or UPI payouts from their Available Withdrawal Balance.';
  }

  if (q.includes('flexistaff') || q.includes('contract')) {
    return 'FlexiStaff is TaskHub’s dedicated long-term staffing solution for retail stores, supermarkets, warehouses, and food industries. It supports structured 1 to 3 month contracts with milestone-based settlement and a platform fee between 5% and 10%.';
  }

  if (q.includes('dispute') || q.includes('refund')) {
    return 'If work is incomplete, service quality is unsatisfactory, or an attendance disagreement occurs, either party can raise a Dispute from the dashboard. Once disputed, automatic payment release is halted immediately and our Master Admin arbitration team reviews the evidence.';
  }

  if (userRole === 'GIG_HOST') {
    return `Hello! As a Gig Host on TaskHub, you can post blank gig requests, set custom shift durations and pay rates, review applicants, monitor the live waiting list, track geofenced attendance, and release payments upon satisfactory completion. How can I assist you with your gig today?`;
  }

  if (userRole === 'GIG_PARTNER') {
    return `Welcome! As a Gig Partner, you can browse nearby flexible gigs within 20 km, apply or join waiting lists, check-in on-site using GPS geofencing, and track your wallet earnings. How can I help you?`;
  }

  if (userRole === 'SERVICE_SEEKER') {
    return `Hello! As a Service Seeker, you can discover top-rated local Tech Partners across 15 categories within 20 km, book appointments with secure Escrow payment (UPI, Cards, Net Banking), and approve work before payment is released. What service are you looking for?`;
  }

  if (userRole === 'TECH_PARTNER') {
    return `Welcome Tech Partner! You can create custom service listings with your own half-day or full-day rates, manage your weekly availability, perform geofenced check-in at customer locations, and manage your Dual Wallet earnings and withdrawals. How can I assist you today?`;
  }

  return 'Welcome to TaskHub Support! I can assist you with account onboarding, gig posting, 20 km radius search, geofenced attendance, FlexiStaff contracts, railway waiting lists, service bookings, Escrow payments, Dual Wallet withdrawals, and dispute policies. What would you like to know?';
}
