import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import OneSignal from 'react-onesignal'; // 🚀 ADDED ONESIGNAL
import Login from './pages/Login';
import StudentDash from './pages/StudentDash';
import FacultyDash from './pages/FacultyDash';
import WardenDash from './pages/WardenDash';
import OfficeDash from './pages/OfficeDash';
import NonTeachingDash from './pages/NonTeachingDash';
import GuardScanner from './pages/GuardScanner';
import ProtectedRoute from './components/ProtectedRoute';
import fluxLogo from './assets/flux-logo.jpeg';
import { Toaster } from 'react-hot-toast';

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🚀 INITIALIZE ONESIGNAL
    const initOneSignal = async () => {
      if (window.__oneSignalInitialized || window.__oneSignalInitializing) return;
      window.__oneSignalInitializing = true;
      try {
        // Await the deletion of the IDB database to prevent race conditions
        await new Promise((resolve) => {
          try {
            const req = indexedDB.deleteDatabase('ONE_SIGNAL_SDK_DB');
            req.onsuccess = resolve;
            req.onerror = resolve;
            req.onblocked = resolve;
          } catch (e) { resolve(); }
        });

        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const r of regs) {
            if (r.active?.scriptURL?.includes('OneSignal')) await r.unregister();
          }
        }
        await OneSignal.init({
          appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
        });
        window.__oneSignalInitialized = true;

        // 🚀 CRITICAL FIX: Since we wiped the IDB (or the user opened a new tab),
        // we MUST re-link this device to their external_id if they are already logged in!
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            if (user && user._id) {
              const extId = user._id.toString();
              console.log(`[ONESIGNAL DEBUG] Logging in with external_id: ${extId}. Role: ${user.role}`);
              await OneSignal.login(extId);
              OneSignal.Slidedown.promptPush(); // Prompt for permission if not already granted!
            }
          } catch (e) {
            console.error("Failed to parse currentUser for OneSignal relogin", e);
          }
        }

      } catch (error) {
        if (!error.message || !error.message.includes('already initialized')) {
          window.__oneSignalInitialized = false;
        } else {
          window.__oneSignalInitialized = true;
        }
        console.error("OneSignal Init Error:", error);
      } finally {
        window.__oneSignalInitializing = false;
      }
    };
    initOneSignal();

    // 2.5s Splash Screen
    const timer = setTimeout(() => setLoading(false), 2500);

    const handleStorageChange = (event) => {
      // If the token changes in localStorage via another tab
      if (event.key === 'authToken') {
        if (event.newValue === null) {
          window.location.href = '/login'; // Instantly kick them out
        } else {
          window.location.reload(); // Automatically log them in with the new token
        }
      } else if (event.key === null) {
        // localStorage.clear() was called
        window.location.href = '/login';
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-teal-600 to-indigo-900 font-sans p-6">
        <div className="animate-pulse mb-6 rounded-3xl overflow-hidden shadow-2xl ring-4 ring-white/20">
          <img src={fluxLogo} alt="Loading Get2Go..." className="w-28 h-28 object-contain" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md mb-2">Flux</h1>
        <p className="text-lg font-medium text-gray-200 tracking-wide">Seamless Access. Smart Mobility.</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route path="/student" element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDash />
          </ProtectedRoute>
        } />
        <Route path="/faculty" element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <FacultyDash />
          </ProtectedRoute>
        } />
        <Route path="/warden" element={
          <ProtectedRoute allowedRoles={['warden']}>
            <WardenDash />
          </ProtectedRoute>
        } />
        <Route path="/office" element={
          <ProtectedRoute allowedRoles={['office']}>
            <OfficeDash />
          </ProtectedRoute>
        } />
        <Route path="/non-teaching" element={
          <ProtectedRoute allowedRoles={['non-teaching']}>
            <NonTeachingDash />
          </ProtectedRoute>
        } />
        <Route path="/guard" element={
          <ProtectedRoute allowedRoles={['guard']}>
            <GuardScanner />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;