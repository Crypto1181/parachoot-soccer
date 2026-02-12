import { useEffect, useRef } from "react";
import { App as CapApp } from '@capacitor/app';
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
// import { PushNotifications } from '@capacitor/push-notifications';
// import { BackgroundFetch } from '@transistorsoft/capacitor-background-fetch';
import { getAggregatedLiveMatches } from './lib/liveTvAggregator';
import { flashscoreApi } from './lib/flashscoreApi';

const queryClient = new QueryClient();

import { Preferences } from '@capacitor/preferences';

const NOTIFIED_MATCHES_KEY = 'notified_matches_v1';
const SCHEDULED_MATCHES_KEY = 'scheduled_matches_v1';

const App: React.FC = () => {
  const notifiedMatchesRef = useRef<Set<string>>(new Set());
  const scheduledMatchesRef = useRef<Set<string>>(new Set());
  const isForegroundRef = useRef<boolean>(true);
  const isStateLoadedRef = useRef<boolean>(false);

  // Initialize everything in one sequence
  useEffect(() => {
    const initialize = async () => {
      try {
        // 1. Load persisted state first
        console.log('[App] Loading persisted state...');
        const notified = await Preferences.get({ key: NOTIFIED_MATCHES_KEY });
        if (notified.value) {
          const arr = JSON.parse(notified.value);
          notifiedMatchesRef.current = new Set(arr);
          console.log(`[App] Loaded ${arr.length} notified matches`);
        }
        
        const scheduled = await Preferences.get({ key: SCHEDULED_MATCHES_KEY });
        if (scheduled.value) {
          const arr = JSON.parse(scheduled.value);
          scheduledMatchesRef.current = new Set(arr);
          console.log(`[App] Loaded ${arr.length} scheduled matches`);
        }
        isStateLoadedRef.current = true;

        // 2. Clear system tray (clean slate for OS notifications)
        console.log('[App] Clearing system tray notifications...');
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
          await LocalNotifications.cancel({ notifications: pending.notifications });
        }

        // 3. Initialize permissions
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display === 'prompt') {
          await LocalNotifications.requestPermissions();
        }

        // 4. Initialize Ads
        try {
          await initializeAdMob();
          await showBanner();
        } catch (error) {
          console.error("AdMob initialization failed", error);
        }

      } catch (e) {
        console.error('Error during initialization:', e);
        isStateLoadedRef.current = true; // Set to true anyway to allow operation
      }
    };

    initialize();

    // App State Listener
    const appStateListener = CapApp.addListener('appStateChange', ({ isActive }) => {
      isForegroundRef.current = isActive;
      console.log(`[App] Foreground state changed: ${isActive}`);
      
      if (!isActive) {
        // Run check immediately when app goes to background
        checkLiveMatches();
      } else {
        // Clear system tray when coming back to foreground
        LocalNotifications.getPending().then(pending => {
          if (pending.notifications.length > 0) {
            LocalNotifications.cancel({ notifications: pending.notifications });
          }
        });
      }
    });

    // Periodic check (every 30 seconds)
    const interval = setInterval(() => {
      if (!isForegroundRef.current) {
        checkLiveMatches();
      }
    }, 30000);

    return () => {
      appStateListener.remove();
      clearInterval(interval);
    };
  }, []);

  const checkLiveMatches = async () => {
    // Safety check: wait for state to load
    if (!isStateLoadedRef.current) {
      console.log('[App] State not loaded yet, skipping check.');
      return;
    }

    // ONLY run if app is NOT in foreground
    if (isForegroundRef.current) return;

    try {
      // 1. Check CURRENT Live Matches
      const groups = await getAggregatedLiveMatches();
      const allMatches = groups.flatMap(g => g.matches);
      
      const now = Date.now();
      const tenMinutesAgo = now - (10 * 60 * 1000);

      const newLiveNotifications = allMatches
        .filter(match => {
          const matchId = match.id.toString();
          const isLive = (match as any).status === 'live';
          
          // Only notify if:
          // 1. Not notified before
          // 2. Is currently live
          // 3. Match started recently (within last 120 mins)
          if (notifiedMatchesRef.current.has(matchId)) return false;
          if (!isLive) return false;

          // If we have a timestamp, check if it's too old (started > 2 hours ago)
          const matchTime = match.timestamp ? match.timestamp * 1000 : now;
          if (matchTime < (now - 120 * 60 * 1000)) {
            return false; 
          }

          return true;
        })
        .map(match => {
          const matchId = match.id.toString();
          const hasStream = match.streamUrl || (match.streamSources && match.streamSources.length > 0);
          const title = hasStream ? 'Live Stream Available! 📺' : 'Match Live Now! ⚽';
          const body = hasStream 
            ? `${match.homeTeam.name} vs ${match.awayTeam.name} is live with stream!`
            : `${match.homeTeam.name} vs ${match.awayTeam.name} is live now!`;
          
          notifiedMatchesRef.current.add(matchId);
          
          return {
            title,
            body,
            id: parseInt(matchId.replace(/\D/g, '').substring(0, 9)) || Math.floor(Math.random() * 1000000),
            schedule: { at: new Date(Date.now() + 1000) },
            extra: { matchId: matchId },
            actionTypeId: '',
          };
        });

      if (newLiveNotifications.length > 0) {
        await LocalNotifications.schedule({ notifications: newLiveNotifications });
        await Preferences.set({
          key: NOTIFIED_MATCHES_KEY,
          value: JSON.stringify(Array.from(notifiedMatchesRef.current))
        });
      }

      // 2. Check UPCOMING Matches
      const upcoming = await flashscoreApi.getMatchesForDate('today', 'upcoming');
      const upcomingMatches = upcoming.flatMap(g => g.matches);
      
      const upcomingNotifications = upcomingMatches
        .filter(match => {
           const matchId = match.id.toString();
           return !scheduledMatchesRef.current.has(matchId) && 
                  !notifiedMatchesRef.current.has(matchId) && 
                  match.timestamp && (match.timestamp * 1000) > Date.now();
        })
        .map(match => {
           const matchId = match.id.toString();
           const startTime = new Date(match.timestamp! * 1000);
           if (startTime.getTime() <= Date.now()) return null;

           const hasStreamPotential = match.competition.toLowerCase().includes('league') || 
                                      match.competition.toLowerCase().includes('cup');

           scheduledMatchesRef.current.add(matchId);

           return {
             title: hasStreamPotential ? 'Live Stream Available! 📺' : 'Match Live Now! ⚽',
             body: `${match.homeTeam.name} vs ${match.awayTeam.name} is starting!`,
             id: parseInt(matchId.replace(/\D/g, '').substring(0, 9)) || Math.floor(Math.random() * 1000000),
             schedule: { at: startTime },
             extra: { matchId: matchId },
             actionTypeId: '',
           };
        })
        .filter((n): n is NonNullable<typeof n> => n !== null);

      if (upcomingNotifications.length > 0) {
        await LocalNotifications.schedule({ notifications: upcomingNotifications });
        await Preferences.set({
          key: SCHEDULED_MATCHES_KEY,
          value: JSON.stringify(Array.from(scheduledMatchesRef.current))
        });
      }
    } catch (e) {
      console.error('Error checking live matches:', e);
    }
  };

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
