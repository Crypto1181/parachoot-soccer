import { useEffect } from "react";
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
import ProfilePage from "./pages/Profile";
import EditProfilePage from "./pages/EditProfile";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import { BackButtonHandler } from "./components/BackButtonHandler";
import { initializeAdMob, showBanner } from "./lib/admob";

const queryClient = new QueryClient();

const App = () => {
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
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                <Route path="/home" element={<HomePage />} />
                <Route path="/live-tv" element={<LiveTVPage />} />
                <Route path="/match/:id" element={<MatchDetailsPage />} />
                <Route path="/stream/:matchId/:provider/:source/:streamId" element={<StreamPlayerPage />} />
                {/* Keep old route for backward compatibility */}
                <Route path="/stream/:matchId/:source/:streamId" element={<StreamPlayerPage />} />
                <Route path="/watch/:id" element={<WatchPage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/profile/edit" element={<EditProfilePage />} />
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
