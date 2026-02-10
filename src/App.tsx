import { useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import MainLayout from "./components/layout/MainLayout";
import LoginPage from "./pages/Login";
import SignupPage from "./pages/Signup";
import HomePage from "./pages/Home";
import LiveTVPage from "./pages/LiveTV";
import WatchPage from "./pages/Watch";
import MatchDetailsPage from "./pages/MatchDetails";
import StreamPlayerPage from "./pages/StreamPlayer";
import ExplorePage from "./pages/Explore";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import { BackButtonHandler } from "./components/BackButtonHandler";
import { initializeAdMob, showBanner } from "./lib/admob";
import { LocalNotifications } from '@capacitor/local-notifications';
import { getAggregatedLiveMatches } from './lib/liveTvAggregator';

const queryClient = new QueryClient();

const App = () => {
  const notifiedMatchesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const initAds = async () => {
      try {
        await initializeAdMob();
        // Show banner after initialization
        // We might want to delay this or only show on certain pages, 
        // but for now, let's show it globally.
        await showBanner();
      } catch (error) {
        console.error("AdMob initialization failed", error);
      }
    };
    initAds();

    // Initialize Notifications
    const initNotifications = async () => {
      try {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display === 'prompt') {
          await LocalNotifications.requestPermissions();
        }
      } catch (e) {
        console.error('Error initializing notifications:', e);
      }
    };
    initNotifications();

    // Background Match Checker
    const checkLiveMatches = async () => {
      try {
        const groups = await getAggregatedLiveMatches();
        const allMatches = groups.flatMap(g => g.matches);
        
        const newNotifications = allMatches
          .filter(match => !notifiedMatchesRef.current.has(match.id))
          .map(match => ({
             title: 'Match Live Now!',
             body: `${match.homeTeam.name} vs ${match.awayTeam.name} is live! Watch now.`,
             id: parseInt(match.id.replace(/\D/g, '').substring(0, 9)) || Math.floor(Math.random() * 1000000),
             schedule: { at: new Date(Date.now() + 1000) },
             extra: { matchId: match.id },
             actionTypeId: '',
          }));
          
        if (newNotifications.length > 0) {
           await LocalNotifications.schedule({ notifications: newNotifications });
           newNotifications.forEach(n => notifiedMatchesRef.current.add(n.extra?.matchId));
           console.log(`[App] 🔔 Scheduled ${newNotifications.length} notifications`);
        }
      } catch (e) {
        console.error('Error checking live matches:', e);
      }
    };

    // Check immediately and then every minute
    checkLiveMatches();
    const interval = setInterval(checkLiveMatches, 60000);
    return () => clearInterval(interval);

  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <HashRouter>
            <BackButtonHandler />
            <Routes>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route element={<MainLayout />}>
                <Route path="/home" element={<HomePage />} />
                <Route path="/live-tv" element={<LiveTVPage />} />
                <Route path="/match/:id" element={<MatchDetailsPage />} />
                <Route path="/stream/:matchId/:provider/:source/:streamId" element={<StreamPlayerPage />} />
                {/* Keep old route for backward compatibility */}
                <Route path="/stream/:matchId/:source/:streamId" element={<StreamPlayerPage />} />
                <Route path="/watch/:id" element={<WatchPage />} />
                <Route path="/explore" element={<ExplorePage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
