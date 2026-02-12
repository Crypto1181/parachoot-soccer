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
import { PushNotifications } from '@capacitor/push-notifications';
// import { BackgroundFetch } from '@transistorsoft/capacitor-background-fetch';
import { getAggregatedLiveMatches } from './lib/liveTvAggregator';
import { flashscoreApi } from './lib/flashscoreApi';

const queryClient = new QueryClient();

const App = () => {
  const notifiedMatchesRef = useRef<Set<string>>(new Set());
  const scheduledMatchesRef = useRef<Set<string>>(new Set());
  const isForegroundRef = useRef<boolean>(true);

  useEffect(() => {
    // Track App State
    CapApp.addListener('appStateChange', ({ isActive }) => {
      isForegroundRef.current = isActive;
      console.log(`[App] Foreground state changed: ${isActive}`);
      
      // Always trigger a check when app state changes
      // This arms notifications when going to background
      // And refreshes state when coming to foreground
      checkLiveMatches();
    });

    // ... ads init ...
    const initAds = async () => {
      try {
        await initializeAdMob();
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
      // ONLY run if app is NOT in foreground (background or closed)
      if (isForegroundRef.current) {
        console.log('[App] App is in foreground, skipping notification scheduling.');
        return;
      }

      try {
        // Clear all previously scheduled notifications to avoid duplicates or old messages
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
          await LocalNotifications.cancel({ notifications: pending.notifications });
        }
        scheduledMatchesRef.current.clear();
        notifiedMatchesRef.current.clear();

        // 1. Check CURRENT Live Matches (for immediate notification)
        const groups = await getAggregatedLiveMatches();
        const allMatches = groups.flatMap(g => g.matches);
        
        const newNotifications = allMatches
          .filter(match => !notifiedMatchesRef.current.has(match.id))
          .map(match => {
             const hasStream = match.streamUrl || (match.streamSources && match.streamSources.length > 0);
             const title = hasStream ? 'Live Stream Available! 📺' : 'Match Live Now! ⚽';
             const body = hasStream 
               ? `${match.homeTeam.name} vs ${match.awayTeam.name} is live with stream! Watch now on Parachoot.`
               : `${match.homeTeam.name} vs ${match.awayTeam.name} is live now!`;
               
             return {
                title,
                body,
                id: parseInt(match.id.replace(/\D/g, '').substring(0, 9)) || Math.floor(Math.random() * 1000000),
                schedule: { at: new Date(Date.now() + 1000) },
                extra: { matchId: match.id },
                actionTypeId: '',
             };
          });
          
        if (newNotifications.length > 0) {
           await LocalNotifications.schedule({ notifications: newNotifications });
           newNotifications.forEach(n => notifiedMatchesRef.current.add(n.extra?.matchId));
           console.log(`[App] 🔔 Scheduled ${newNotifications.length} immediate notifications`);
        }

        // 2. Check UPCOMING Matches (to schedule in advance for background)
        const upcoming = await flashscoreApi.getMatchesForDate('today', 'upcoming');
        const upcomingMatches = upcoming.flatMap(g => g.matches);
        
        const upcomingNotifications = upcomingMatches
          .filter(match => !scheduledMatchesRef.current.has(match.id) && match.timestamp && (match.timestamp * 1000) > Date.now())
          .map(match => {
             const startTime = new Date(match.timestamp! * 1000);
             // Since we're scheduling for the future, we assume it's a live match alert
             // We can check if it's likely to have a stream (optional)
             const hasStreamPotential = match.competition.toLowerCase().includes('league') || 
                                        match.competition.toLowerCase().includes('cup') ||
                                        match.competition.toLowerCase().includes('premier');

             return {
               title: hasStreamPotential ? 'Live Stream Available! 📺' : 'Match Live Now! ⚽',
               body: hasStreamPotential 
                 ? `${match.homeTeam.name} vs ${match.awayTeam.name} live stream now! Watch now on Parachoot.`
                 : `${match.homeTeam.name} vs ${match.awayTeam.name} is live now!`,
               id: parseInt(match.id.replace(/\D/g, '').substring(0, 9)) || Math.floor(Math.random() * 1000000),
               schedule: { at: startTime },
               extra: { matchId: match.id },
               actionTypeId: '',
             };
          });

        if (upcomingNotifications.length > 0) {
           await LocalNotifications.schedule({ notifications: upcomingNotifications });
           upcomingNotifications.forEach(n => scheduledMatchesRef.current.add(n.extra?.matchId));
           console.log(`[App] 📅 Pre-scheduled ${upcomingNotifications.length} notifications for upcoming matches today`);
        }
      } catch (e) {
        console.error('Error checking matches:', e);
      }
    };

    // Do NOT check immediately on load (wait for background state)
    // checkLiveMatches();

    // Initialize Push Notifications
    const initPushNotifications = async () => {
      // Request permission to use push notifications
      // iOS will prompt a user for permission out of the box
      // Android will just return 'granted'
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        throw new Error('User denied permissions!');
      }

      // On success, we should be able to receive notifications
      await PushNotifications.register();

      // On success, we should be able to receive notifications
      PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success, token: ' + token.value);
        // Here you would typically send the token to your server
      });

      // Some issue with our setup and push will not work
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Error on registration: ' + JSON.stringify(error));
      });

      // Show us the notification payload if the app is open on our device
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received: ' + JSON.stringify(notification));
      });

      // Method called when tapping on a notification
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push action performed: ' + JSON.stringify(notification));
      });
    };

    initPushNotifications();

    /*
    // Initialize Background Fetch
    const initBackgroundFetch = async () => {
      try {
        const status = await BackgroundFetch.configure({
          minimumFetchInterval: 15,
          stopOnTerminate: false,
          startOnBoot: true,
          enableHeadless: true,
          requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY
        }, async (taskId) => {
          console.log('[BackgroundFetch] Event received:', taskId);
          await checkLiveMatches();
          BackgroundFetch.finish(taskId);
        }, async (taskId) => {
          console.log('[BackgroundFetch] TIMEOUT:', taskId);
          BackgroundFetch.finish(taskId);
        });
        console.log('[BackgroundFetch] configure status:', status);
      } catch (e) {
        console.error('[BackgroundFetch] configure failed:', e);
      }
    };

    initBackgroundFetch();
    */

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
