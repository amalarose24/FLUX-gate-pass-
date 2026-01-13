import { useState, useEffect } from 'react';
import QRCode from "react-qr-code";
import { STUDENT_SEEKERS, AUTO_DRIVERS, MOCK_HISTORY } from '../mockData';
import Navbar from '../components/Navbar';

function StudentDash() {
  const [activeTab, setActiveTab] = useState('pass');
  const [passStatus, setPassStatus] = useState('Idle'); 
  
  // FORM STATES
  const [reason, setReason] = useState('Home');
  const [customReason, setCustomReason] = useState('');
  const [willReturn, setWillReturn] = useState(false);
  const [returnTime, setReturnTime] = useState('');
  
  // TRANSPORT STATES
  const [needRide, setNeedRide] = useState(false);
  const [destination, setDestination] = useState('Angamaly');

  const [currentTime, setCurrentTime] = useState(new Date());
  const user = JSON.parse(sessionStorage.getItem('currentUser')) || { name: 'Student', role: 'student', isHosteler: false };

  // 1. CHECK FOR ACTIVE PASS ON LOAD (Fix for "QR code not showing")
  useEffect(() => {
    const savedPass = localStorage.getItem('activePass');
    if (savedPass) {
        setPassStatus('Approved');
        // Restore Transport settings if they had them
        const parsed = JSON.parse(savedPass);
        if(parsed.destination) {
            setNeedRide(true);
            setDestination(parsed.destination);
        }
    }
  }, []);

  // Real-time Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getApprover = () => {
    const currentHour = new Date().getHours();
    if (user.isHosteler) {
        return (currentHour >= 9 && currentHour < 16) ? "Advisor" : "Warden";
    }
    return "Advisor";
  };

  const handleRequest = () => {
    if (reason === 'Other' && !customReason) return alert("Please specify the reason.");
    if (willReturn && !returnTime) return alert("Please set a return time.");
    
    setPassStatus('Pending');
    
    setTimeout(() => {
        setPassStatus('Approved');
        // 2. SAVE PASS TO STORAGE (So it stays even if you refresh)
        const passData = {
            user: user.name,
            reason: reason,
            destination: needRide ? destination : null,
            willReturn: willReturn,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('activePass', JSON.stringify(passData));
    }, 2000);
  };

  const closePass = () => {
      // Logic: Only allow close if user manually wants to, or Guard scanned it.
      // For demo, we allow manual close.
      setPassStatus('Idle');
      localStorage.removeItem('activePass');
  };

  // Filter Logic: Find students going to the SAME destination
  const matchingStudents = STUDENT_SEEKERS.filter(s => s.route.includes(destination));

  return (
    <div className="fade-in">
      <Navbar />

      <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
            <h2 style={{ color: 'white', margin: 0 }}>Student Dashboard</h2>
            <div style={{ color: '#b3b3b3' }}>{user.name} | {user.dept}</div>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
             <span onClick={() => setActiveTab('pass')} style={{ cursor: 'pointer', color: activeTab === 'pass' ? '#e50914' : '#777', fontWeight: 'bold' }}>Active Pass</span>
             <span onClick={() => setActiveTab('history')} style={{ cursor: 'pointer', color: activeTab === 'history' ? '#e50914' : '#777', fontWeight: 'bold' }}>History</span>
        </div>

        {/* --- TAB 1: PASS REQUEST & QR --- */}
        {activeTab === 'pass' && (
            <>
                {passStatus === 'Idle' && (
                <div className="glass-card">
                    <h3 style={{marginBottom: '20px', color: '#e50914'}}>Request Gate Pass</h3>

                    {/* REASON */}
                    <label style={{ color: '#b3b3b3', display: 'block', marginBottom: '5px' }}>Reason</label>
                    <select className="netflix-input" onChange={(e) => setReason(e.target.value)}>
                    <option value="Home">Going Home</option>
                    <option value="Lunch">Lunch / Town</option>
                    <option value="Medical">Medical / Hospital</option>
                    <option value="Other">Other Reason</option>
                    </select>

                    {reason === 'Other' && (
                    <input className="netflix-input" placeholder="Specific Reason..." value={customReason} onChange={e => setCustomReason(e.target.value)} />
                    )}

                    {/* TRANSPORTATION LOGIC */}
                    <div style={{ margin: '15px 0', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px' }}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <label style={{ color: '#fff' }}>Need Transportation?</label>
                            <input type="checkbox" checked={needRide} onChange={() => setNeedRide(!needRide)} style={{ width: '20px', height: '20px' }} />
                        </div>

                        {needRide && (
                            <div className="fade-in" style={{ marginTop: '15px' }}>
                                <label style={{ color: '#b3b3b3', display: 'block', marginBottom: '5px' }}>Select Destination</label>
                                <select className="netflix-input" onChange={(e) => setDestination(e.target.value)}>
                                    <option value="Angamaly">Angamaly (Town/Railway)</option>
                                    <option value="Mookannoor">Mookannoor</option>
                                    <option value="Aluva">Aluva</option>
                                    <option value="Chalakudy">Chalakudy</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* RETURN LOGIC */}
                    <div style={{ marginBottom: '20px' }}>
                    <label style={{ color: '#b3b3b3', marginRight: '10px' }}>Will you return?</label>
                    <button onClick={() => setWillReturn(true)} style={{ padding: '5px 15px', marginRight: '5px', background: willReturn ? '#46d369' : '#333', color: 'white', border: 'none' }}>YES</button>
                    <button onClick={() => setWillReturn(false)} style={{ padding: '5px 15px', background: !willReturn ? '#e50914' : '#333', color: 'white', border: 'none' }}>NO</button>
                    </div>

                    {willReturn && (
                        <input type="time" className="netflix-input" value={returnTime} onChange={e => setReturnTime(e.target.value)} />
                    )}

                    <p style={{ fontSize: '13px', color: '#b3b3b3' }}>
                        Request sent to: <strong style={{ color: '#fff' }}>{getApprover()}</strong>
                    </p>

                    <button className="netflix-btn" onClick={handleRequest}>REQUEST PASS</button>
                </div>
                )}

                {passStatus === 'Pending' && (
                    <div className="glass-card" style={{textAlign: 'center', padding: '40px'}}>
                         <div style={{color: 'white'}}>Sending Request...</div>
                    </div>
                )}

                {/* APPROVED VIEW - KEEPS SHOWING UNTIL CLOSED */}
                {passStatus === 'Approved' && (
                <div className="glass-card" style={{ textAlign: 'center', borderTop: '4px solid #46d369' }}>
                    <h2 style={{ color: '#46d369' }}>APPROVED</h2>
                    
                    <div style={{ background: 'white', padding: '10px', display: 'inline-block', borderRadius: '5px' }}>
                        {/* QR Code string contains needed data */}
                        <QRCode value={`PASS:${user.name}:${destination}:${willReturn ? 'DOUBLE' : 'SINGLE'}`} size={140} />
                    </div>

                    {/* RIDE MATCHING RESULTS */}
                    {needRide && (
                        <div style={{ marginTop: '20px', textAlign: 'left' }}>
                            <h4 style={{ color: 'white', borderBottom: '1px solid #444', paddingBottom: '5px', marginTop: '20px' }}>
                                👥 Students to Share Ride (to {destination})
                            </h4>
                            {matchingStudents.length > 0 ? matchingStudents.map(s => (
                                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#333', marginBottom: '5px', borderRadius: '4px' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{s.name}</div>
                                        <div style={{ fontSize: '11px', color: '#aaa' }}>Waiting: {s.waitTime}</div>
                                    </div>
                                    <button style={{ background: '#e50914', border: 'none', color: 'white', padding: '5px 10px', fontSize: '12px', borderRadius: '4px' }}>Call</button>
                                </div>
                            )) : <p style={{color:'#777', fontSize:'13px'}}>No students waiting for this route.</p>}

                            <h4 style={{ color: 'white', borderBottom: '1px solid #444', paddingBottom: '5px', marginTop: '20px' }}>
                                🛺 Nearby Auto Drivers
                            </h4>
                            {AUTO_DRIVERS.map(driver => (
                                <div key={driver.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#333', marginBottom: '5px', borderRadius: '4px' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{driver.name}</div>
                                        <div style={{ fontSize: '11px', color: driver.status === 'Available' ? '#46d369' : 'orange' }}>{driver.status}</div>
                                    </div>
                                    <button style={{ background: '#333', border: '1px solid #777', color: 'white', padding: '5px 10px', fontSize: '12px', borderRadius: '4px' }}>Call</button>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <div style={{marginTop: '20px', padding: '10px', background: '#333', fontSize: '12px', color: '#aaa'}}>
                        {willReturn 
                            ? "Double Scan Enabled: This QR code will remain available for your return scan." 
                            : "Single Scan: This QR code is for exit only."}
                    </div>

                    <button onClick={closePass} style={{ marginTop: '20px', background: 'transparent', color: '#777', border: 'none', cursor: 'pointer' }}>Close Pass</button>
                </div>
                )}
            </>
        )}

        {/* --- TAB 2: HISTORY (FIXED) --- */}
        {activeTab === 'history' && (
            <div className="fade-in">
                {MOCK_HISTORY.length > 0 ? (
                    MOCK_HISTORY.map((log) => (
                        <div key={log.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{log.type}</div>
                                <div style={{ fontSize: '12px', color: '#777' }}>{log.date}</div>
                            </div>
                            <div className="status-badge" style={{ background: '#333', color: '#b3b3b3' }}>
                                {log.status}
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{textAlign: 'center', color: '#777', marginTop: '20px'}}>No history records found.</div>
                )}
            </div>
        )}

      </div>
    </div>
  );
}

export default StudentDash;