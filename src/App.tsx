import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { RealtimeProvider } from './context/RealtimeContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { Chatbot } from './components/Chatbot.tsx';
import { WebPushPrompt } from './components/WebPushPrompt.tsx';

// Pages
import { Home } from './pages/Home.tsx';
import { PortalRegister } from './pages/Auth/PortalRegister.tsx';
import { PortalLogin } from './pages/Auth/PortalLogin.tsx';
import { AdminLogin } from './pages/Auth/AdminLogin.tsx';

// Gig Host
import { HostDashboard } from './pages/GigHost/HostDashboard.tsx';
import { PostGig } from './pages/GigHost/PostGig.tsx';
import { ManageGigs } from './pages/GigHost/ManageGigs.tsx';
import { CompletionApprovals } from './pages/GigHost/CompletionApprovals.tsx';

// Gig Partner
import { PartnerDashboard } from './pages/GigPartner/PartnerDashboard.tsx';
import { BrowseGigs } from './pages/GigPartner/BrowseGigs.tsx';
import { PartnerMapView } from './pages/GigPartner/PartnerMapView.tsx';
import { PartnerEarnings } from './pages/GigPartner/PartnerEarnings.tsx';

// Tech Partner
import { TechDashboard } from './pages/TechPartner/TechDashboard.tsx';
import { CreateService } from './pages/TechPartner/CreateService.tsx';
import { TechBookings } from './pages/TechPartner/TechBookings.tsx';
import { DualWallet } from './pages/TechPartner/DualWallet.tsx';

// Service Seeker
import { SeekerDashboard } from './pages/ServiceSeeker/SeekerDashboard.tsx';
import { SearchTechPartners } from './pages/ServiceSeeker/SearchTechPartners.tsx';
import { SeekerMapView } from './pages/ServiceSeeker/SeekerMapView.tsx';
import { MyBookings } from './pages/ServiceSeeker/MyBookings.tsx';

// Admin
import { AdminDashboard } from './pages/Admin/AdminDashboard.tsx';
import { MicroGigMonitor } from './pages/Admin/MicroGigMonitor.tsx';
import { LocalServiceMonitor } from './pages/Admin/LocalServiceMonitor.tsx';
import { CommandCenter } from './pages/Admin/CommandCenter.tsx';

// Comprehensive Profile
import { MyProfile } from './pages/Profile/MyProfile.tsx';

const AppContent: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname || '/');

  const navigate = (path: string) => {
    // If anchor on home page
    if (path.startsWith('/#')) {
      if (window.location.pathname !== '/') {
        window.history.pushState({}, '', '/');
        setCurrentPath('/');
      }
      setTimeout(() => {
        const id = path.replace('/#', '');
        const elem = document.getElementById(id);
        if (elem) elem.scrollIntoView({ behavior: 'smooth' });
      }, 50);
      return;
    }

    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const renderRoute = () => {
    const path = currentPath;

    // Home
    if (path === '/' || path === '') {
      return <Home navigate={navigate} />;
    }

    // 1. Separate Independent Registration Pages (No dropdown, enforced backend role)
    if (path === '/host/register') {
      return (
        <PortalRegister
          portalRole="gig-host"
          title="Gig Host Registration"
          subtitle="For businesses, employers, shops, supermarkets, and event organizers hiring temporary workers."
          accentColor="indigo"
          navigate={navigate}
        />
      );
    }
    if (path === '/partner/register') {
      return (
        <PortalRegister
          portalRole="gig-partner"
          title="Gig Partner Registration"
          subtitle="For individuals discovering and applying for flexible temporary jobs, shifts, and staffing contracts."
          accentColor="blue"
          navigate={navigate}
        />
      );
    }
    if (path === '/seeker/register') {
      return (
        <PortalRegister
          portalRole="service-seeker"
          title="Service Seeker Registration"
          subtitle="For customers finding and booking verified local technicians with escrow protection."
          accentColor="cyan"
          navigate={navigate}
        />
      );
    }
    if (path === '/tech/register') {
      return (
        <PortalRegister
          portalRole="tech-partner"
          title="Tech Partner Registration"
          subtitle="For certified technicians and service professionals publishing services and receiving customer bookings."
          accentColor="amber"
          navigate={navigate}
        />
      );
    }

    // 2. Separate Independent Login Pages
    if (path === '/host/login') {
      return (
        <PortalLogin
          portalRole="gig-host"
          title="Gig Host Login"
          subtitle="Access your shift dashboard and applicant review center."
          navigate={navigate}
        />
      );
    }
    if (path === '/partner/login') {
      return (
        <PortalLogin
          portalRole="gig-partner"
          title="Gig Partner Login"
          subtitle="Sign into your flexible shifts portal and view nearby opportunities."
          navigate={navigate}
        />
      );
    }
    if (path === '/seeker/login') {
      return (
        <PortalLogin
          portalRole="service-seeker"
          title="Service Seeker Login"
          subtitle="Access your appointments, receipts, and escrow release controls."
          navigate={navigate}
        />
      );
    }
    if (path === '/tech/login') {
      return (
        <PortalLogin
          portalRole="tech-partner"
          title="Tech Partner Login"
          subtitle="Sign in to manage service listings, bookings, and dual-wallet earnings."
          navigate={navigate}
        />
      );
    }
    if (path === '/admin/login') {
      return <AdminLogin navigate={navigate} />;
    }

    // 3. Gig Host Portal
    if (path === '/host/dashboard') {
      return <HostDashboard navigate={navigate} />;
    }
    if (path === '/host/post-gig') {
      return <PostGig navigate={navigate} />;
    }
    if (path === '/host/approvals') {
      return <CompletionApprovals navigate={navigate} />;
    }
    if (path.startsWith('/host/gigs/')) {
      const gigId = path.replace('/host/gigs/', '');
      return <ManageGigs gigId={gigId} navigate={navigate} />;
    }

    // 4. Gig Partner Portal
    if (path === '/partner/dashboard') {
      return <PartnerDashboard navigate={navigate} />;
    }
    if (path === '/partner/browse') {
      return <BrowseGigs navigate={navigate} />;
    }
    if (path === '/partner/map') {
      return <PartnerMapView navigate={navigate} />;
    }
    if (path === '/partner/earnings') {
      return <PartnerEarnings navigate={navigate} />;
    }

    // 5. Tech Partner Portal
    if (path === '/tech/dashboard') {
      return <TechDashboard navigate={navigate} />;
    }
    if (path === '/tech/create-service') {
      return <CreateService navigate={navigate} />;
    }
    if (path === '/tech/bookings') {
      return <TechBookings navigate={navigate} />;
    }
    if (path === '/tech/wallet') {
      return <DualWallet navigate={navigate} />;
    }

    // 6. Service Seeker Portal
    if (path === '/seeker/dashboard') {
      return <SeekerDashboard navigate={navigate} />;
    }
    if (path === '/seeker/search') {
      return <SearchTechPartners navigate={navigate} />;
    }
    if (path === '/seeker/map') {
      return <SeekerMapView navigate={navigate} />;
    }
    if (path === '/seeker/bookings') {
      return <MyBookings navigate={navigate} />;
    }

    // 7. Master Admin Control Panel
    if (path === '/admin/dashboard') {
      return <AdminDashboard navigate={navigate} />;
    }
    if (path === '/admin/micro-gig-monitor') {
      return <MicroGigMonitor navigate={navigate} />;
    }
    if (path === '/admin/local-service-monitor') {
      return <LocalServiceMonitor navigate={navigate} />;
    }
    if (path === '/admin/command-center') {
      return <CommandCenter navigate={navigate} />;
    }

    // 8. User Profile (All Roles)
    if (path === '/profile' || path === '/my-profile') {
      return <MyProfile navigate={navigate} />;
    }

    // Fallback Home
    return <Home navigate={navigate} />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      <Navbar currentPath={currentPath} navigate={navigate} />
      <WebPushPrompt />
      <main className="flex-1">{renderRoute()}</main>
      <Footer navigate={navigate} />
      <Chatbot />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <AppContent />
      </RealtimeProvider>
    </AuthProvider>
  );
}
