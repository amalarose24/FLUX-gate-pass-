// src/pages/GuardScanner.jsx
import { useState } from 'react';
import { addLog } from '../mockData';
import Navbar from '../components/Navbar';

function GuardScanner() {
  const [scanned, setScanned] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  
  // Guard User Data (For Navbar)
  const user = { name: 'Main Guard', role: 'Security' };

  const handleScan = () => {
    // SIMULATION: Toggle between Inside/Outside states to show both buttons working
    const randomStatus = Math.random() > 0.5 ? 'INSIDE' : 'OUT';
    
    const mockData = { 
        id: Date.now(), 
        name: 'Arjun K (S5 CS)', 
        type: 'Town (Returnable)', 
        photo: 'https://via.placeholder.com/100',
        currentStatus: randomStatus // This decides which button to show
    };
    
    setScanResult(mockData);
    setScanned(true);
  };

  const processAction = (action) => {
    alert(`${action} Confirmed for ${scanResult.name}`);
    
    // Log to system
    addLog({
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        type: scanResult.type,
        status: action // 'EXIT' or 'ENTRY'
    });

    setScanned(false);
    setScanResult(null);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'black', display: 'flex', flexDirection: 'column' }}>
      <Navbar user={user} />

      <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        
        {/* SCANNER UI */}
        {!scanned ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '280px', height: '280px', border: '4px solid #e50914', borderRadius: '20px', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 0 30px rgba(229, 9, 20, 0.3)' }}>
                {/* Crosshair corners */}
                <div style={{position:'absolute', top:'10px', left:'10px', width:'30px', height:'30px', borderTop:'4px solid white', borderLeft:'4px solid white'}}></div>
                <div style={{position:'absolute', top:'10px', right:'10px', width:'30px', height:'30px', borderTop:'4px solid white', borderRight:'4px solid white'}}></div>
                <div style={{position:'absolute', bottom:'10px', left:'10px', width:'30px', height:'30px', borderBottom:'4px solid white', borderLeft:'4px solid white'}}></div>
                <div style={{position:'absolute', bottom:'10px', right:'10px', width:'30px', height:'30px', borderBottom:'4px solid white', borderRight:'4px solid white'}}></div>
                
                <span style={{ color: 'white', animation: 'pulse 1s infinite', letterSpacing: '2px' }}>SCANNING...</span>
            </div>
            <p style={{ color: '#777', marginTop: '20px' }}>Point camera at student QR code</p>
            <button onClick={handleScan} className="netflix-btn" style={{ marginTop: '10px' }}>TAP TO SIMULATE SCAN</button>
          </div>
        ) : (
          /* RESULT UI */
          <div className="glass-card" style={{ textAlign: 'center', width: '100%', maxWidth: '350px', padding: '30px' }}>
             <img src={scanResult.photo} style={{ width: '100px', height: '100px', borderRadius: '50%', border: '3px solid white', marginBottom: '15px' }} />
             <h2 style={{ margin: '0 0 5px 0', color: 'white' }}>{scanResult.name}</h2>
             <p style={{ color: '#b3b3b3', margin: '0 0 20px 0' }}>{scanResult.type}</p>

             <div style={{ background: '#333', padding: '10px', borderRadius: '5px', marginBottom: '20px' }}>
                Status: <strong style={{ color: scanResult.currentStatus === 'INSIDE' ? '#46d369' : 'orange' }}>{scanResult.currentStatus}</strong>
             </div>

             {/* LOGIC: Show EXIT button if Inside, ENTRY button if Out */}
             {scanResult.currentStatus === 'INSIDE' ? (
                 <button onClick={() => processAction('EXIT')} className="netflix-btn" style={{ background: '#e50914' }}>
                    CONFIRM EXIT 
                 </button>
             ) : (
                 <button onClick={() => processAction('ENTRY')} className="netflix-btn" style={{ background: '#46d369' }}>
                    CONFIRM ENTRY
                 </button>
             )}
             
             <button onClick={() => setScanned(false)} style={{ background: 'transparent', border: 'none', color: '#777', marginTop: '15px', cursor: 'pointer', textDecoration: 'underline' }}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default GuardScanner;