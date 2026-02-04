import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

/**
 * Handles Android back button / swipe-back.
 * Navigates back in-app instead of closing the app.
 * On login/signup, exits the app (no in-app "back" target).
 */
export function BackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handler = () => {
      const path = location.pathname || '';
      const isExitPage = path === '/login' || path === '/signup' || path === '/' || path === '' || path === '/home';

      if (isExitPage) {
        App.exitApp();
        return;
      }

      // Check if we can go back in history
      // React Router maintains an 'idx' in history.state
      const historyState = window.history.state as { idx?: number } | null;
      
      if (historyState?.idx && historyState.idx > 0) {
        navigate(-1);
      } else {
        // If no history (e.g. deep link or refresh), go to home instead of exiting
        navigate('/home', { replace: true });
      }
    };

    const listenerPromise = App.addListener('backButton', handler);
    return () => {
      listenerPromise.then((l) => l.remove());
    };
  }, [navigate, location.pathname]);

  return null;
}
