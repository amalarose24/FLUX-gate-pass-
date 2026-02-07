import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import StudentDash from './pages/StudentDash';
import FacultyDash from './pages/FacultyDash';
import WardenDash from './pages/WardenDash';
import OfficeDash from './pages/OfficeDash';
import GuardScanner from './pages/GuardScanner';

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => { setTimeout(() => setLoading(false), 2000); }, []);

  if (loading) {
    return (
      <div style={{height:'100vh', background:'black', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', color:'white'}}>
        <div style={{fontSize:'3rem', fontWeight:'bold', letterSpacing:'5px', color:'#e50914'}}>FLUX</div>
        <p style={{color:'#aaa', marginTop:'10px'}}>SCAN. MOVE. DONE.</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/student" element={<StudentDash />} />
        <Route path="/faculty" element={<FacultyDash />} />
        <Route path="/non-teaching" element={<FacultyDash />} /> {/* Unified Dash */}
        <Route path="/warden" element={<WardenDash />} />
        <Route path="/office" element={<OfficeDash />} />
        <Route path="/guard" element={<GuardScanner />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;