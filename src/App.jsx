import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import StudentDash from './pages/StudentDash';
import FacultyDash from './pages/FacultyDash'; 
import GuardScanner from './pages/GuardScanner'; 
import ApproverDash from './pages/ApproverDash'; 
import OfficeDash from './pages/OfficeDash'; 

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Splash screen timer (3.5s for full animation)
    const timer = setTimeout(() => setLoading(false), 3500); 
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div style={splashContainer}>
        {/* LOGO IMAGE */}
        <img src="/flux-logo.jpeg" alt="FLUX Logo" className="logo-img-splash" />
        
        {/* APP NAME */}
        <div className="flux-title">FLUX</div>
        
        {/* ANIMATED TAGLINE */}
        <div className="tagline-container">
            <span className="tagline-word">SCAN.</span>
            <span className="tagline-word">MOVE.</span>
            <span className="tagline-word">DONE.</span>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* User Dashboards */}
        <Route path="/student" element={<StudentDash />} />
        <Route path="/faculty" element={<FacultyDash />} />
        <Route path="/guard" element={<GuardScanner />} />
        
        {/* Approver Dashboards */}
        <Route path="/warden" element={<ApproverDash role="Warden" />} />
        <Route path="/advisor" element={<ApproverDash role="Advisor" />} />
        <Route path="/office" element={<OfficeDash />} />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

// Splash Screen Container Style
const splashContainer = {
  height: '100vh',
  background: '#000', 
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden'
};

export default App;