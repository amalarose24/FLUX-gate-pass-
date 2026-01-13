// src/pages/FacultyDash.jsx
import { useState, useEffect } from 'react';
import QRCode from "react-qr-code";
import { MOCK_HISTORY } from '../mockData';
import Navbar from '../components/Navbar';

// We accept a prop 'disableNav' so we don't show double navbars in ApproverDash
function FacultyDash({ disableNav }) {
  const [activeTab, setActiveTab] = useState('request');
  const [passStatus, setPassStatus] = useState('Idle'); 

  // FORM DATA
  const [reason, setReason] = useState('Official');
  const [willReturn, setWillReturn] = useState(true);
  const [returnTime, setReturnTime] = useState('');
  
  const user = JSON.parse(sessionStorage.getItem('currentUser')) || { name: 'Faculty', dept: 'General' };

  // 1. CHECK FOR ACTIVE PASS (Persistence)
  useEffect(() => {
    const savedPass = localStorage.getItem(`activePass_${user.name}`);
    if (savedPass) {
        setPassStatus('Approved');
    }
  }, [user.name]);

  const handleRequest = () => {
    if (willReturn && !returnTime) return alert("Please set an estimated return time.");

    setPassStatus('Pending');
    
    // Simulate Office Approval
    setTimeout(() => {
        setPassStatus('Approved');
        const passData = {
            user: user.name,
            reason: reason,
            willReturn: willReturn,
            returnTime: returnTime,
            timestamp: new Date().toISOString()
        };
        // Save unique pass for this user
        localStorage.setItem(`activePass_${user.name}`, JSON.stringify(passData));
    }, 2000);
  };

  const closePass = () => {
      setPassStatus('Idle');
      localStorage.removeItem(`activePass_${user.name}`);
  };

  return (
    <div className="fade-in">
      {/* Only show Navbar if NOT embedded in another dashboard */}
      {!disableNav && <Navbar />}

      <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
        
        {!disableNav && (
            <div style={{ marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                <h2 style={{ margin: 0, color: 'white' }}>Faculty Dashboard</h2>
                <p style={{ margin: 0, color: '#b3b3b3' }}>{user.name} | {user.dept}</p>
            </div>
        )}

        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid #444' }}>
            <span onClick={() => setActiveTab('request')} style={{ cursor: 'pointer', padding: '10px', color: activeTab === 'request' ? '#e50914' : 'white', fontWeight: 'bold' }}>Active Pass</span>
            <span onClick={() => setActiveTab('history')} style={{ cursor: 'pointer', padding: '10px', color: activeTab === 'history' ? '#e50914' : 'white', fontWeight: 'bold' }}>Movement Log</span>
        </div>

        {activeTab === 'request' && (
          <>
            {passStatus === 'Idle' && (
                <div className="glass-card">
                    <h3 style={{marginBottom: '15px'}}>Request Gate Pass</h3>
                    
                    <label style={{display:'block', marginBottom:'5px', color:'#ccc'}}>Purpose</label>
                    <select className="netflix-input" onChange={e => setReason(e.target.value)}>
                        <option value="Official">Official Duty</option>
                        <option value="Personal">Personal / Home</option>
                        <option value="Lunch">Lunch Break</option>
                    </select>

                    <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px' }}>
                        <p style={{margin: '0 0 10px 0', fontSize: '14px', color: 'white'}}>Will you return to campus?</p>
                        <div style={{display: 'flex', gap: '10px', marginBottom: '10px'}}>
                            <button onClick={() => setWillReturn(true)} style={{flex: 1, padding: '8px', background: willReturn ? '#46d369' : '#333', color: 'white', border: 'none', borderRadius: '4px'}}>YES</button>
                            <button onClick={() => setWillReturn(false)} style={{flex: 1, padding: '8px', background: !willReturn ? '#e50914' : '#333', color: 'white', border: 'none', borderRadius: '4px'}}>NO</button>
                        </div>
                        
                        {willReturn ? (
                            <div className="fade-in">
                                <label style={{color: '#aaa', fontSize: '12px'}}>Expected Return Time</label>
                                <input type="time" className="netflix-input" value={returnTime} onChange={e => setReturnTime(e.target.value)} />
                            </div>
                        ) : (
                            <div style={{color: '#e50914', fontSize: '12px'}}>
                                * Will be logged as Half Day Leave.
                            </div>
                        )}
                    </div>

                    <p style={{ fontSize: '13px', color: '#b3b3b3' }}>
                        Request sent to: <strong style={{ color: '#fff' }}>Administrative Office</strong>
                    </p>

                    <button className="netflix-btn" onClick={handleRequest}>SUBMIT REQUEST</button>
                </div>
            )}

            {passStatus === 'Pending' && (
                 <div className="glass-card" style={{textAlign: 'center', padding: '30px'}}>
                     <div style={{color: 'white'}}>Waiting for Office Approval...</div>
                 </div>
            )}

            {passStatus === 'Approved' && (
                <div className="glass-card" style={{ textAlign: 'center', borderTop: '4px solid #46d369' }}>
                    <h2 style={{ color: '#46d369' }}>APPROVED</h2>
                    <div style={{ background: 'white', padding: '15px', borderRadius: '8px', display: 'inline-block' }}>
                        <QRCode value={`PASS:${user.name}:${reason}:${willReturn ? 'DOUBLE' : 'SINGLE'}`} size={150} />
                    </div>
                    
                    <div style={{marginTop: '20px', textAlign: 'left', background: '#333', padding: '15px', borderRadius: '5px'}}>
                        <div><strong>Scan Type:</strong> {willReturn ? 'Double (Exit & Entry)' : 'Single (Exit Only)'}</div>
                        {willReturn && <div><strong>Deadline:</strong> {returnTime}</div>}
                    </div>

                    <div style={{marginTop: '10px', fontSize: '12px', color: '#aaa'}}>
                        * Scan at gate to log Exit Time. 
                        {willReturn && " Keep this open for Re-entry scan."}
                    </div>

                    <button onClick={closePass} style={{ marginTop: '20px', background: 'transparent', color: '#777', border: 'none', cursor: 'pointer' }}>Close Pass</button>
                </div>
            )}
          </>
        )}

        {activeTab === 'history' && (
            <div className="fade-in">
                {MOCK_HISTORY.map((log) => (
                <div key={log.id} className="glass-card" style={{ padding: '15px', borderLeft: '4px solid #e50914' }}>
                    <strong>{log.type}</strong>
                    <p style={{ margin: '5px 0', fontSize: '13px', color: '#ccc' }}>{log.date} - {log.status}</p>
                </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}

export default FacultyDash;