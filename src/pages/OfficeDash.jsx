// src/pages/OfficeDash.jsx
import { useState } from 'react';
import { GLOBAL_REQUESTS, MOCK_HISTORY } from '../mockData';
import Navbar from '../components/Navbar';

function OfficeDash() {
  const [activeTab, setActiveTab] = useState('leave');
  // Simulating Faculty requests
  const [requests, setRequests] = useState(GLOBAL_REQUESTS.filter(r => r.name.includes('Prof') || r.name.includes('Warden') || r.name.includes('Advisor')));

  return (
    <div className="fade-in">
      <Navbar />

      <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
        <h2 style={{ color: '#e50914' }}>Administrative Office</h2>
        
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid #333', marginTop: '20px' }}>
            <span onClick={() => setActiveTab('leave')} style={{ cursor: 'pointer', color: activeTab === 'leave' ? 'white' : '#737373', fontWeight: 'bold' }}>Faculty Permissions</span>
            <span onClick={() => setActiveTab('logs')} style={{ cursor: 'pointer', color: activeTab === 'logs' ? 'white' : '#737373', fontWeight: 'bold' }}>Movement Logs</span>
        </div>

        {activeTab === 'leave' && (
            <div>
                {requests.length === 0 && <p style={{color: '#777'}}>No pending faculty requests.</p>}
                {requests.map(req => (
                    <div key={req.id} className="glass-card" style={{borderLeft: req.willReturn ? '4px solid green' : '4px solid red'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between'}}>
                            <h3>{req.name}</h3>
                            <span style={{background: req.willReturn ? 'green' : 'red', padding: '5px 10px', borderRadius: '4px', fontSize: '12px', height: 'fit-content'}}>
                                {req.willReturn ? 'MOVEMENT' : 'HALF DAY LEAVE'}
                            </span>
                        </div>
                        <p>Reason: {req.type}</p>
                        <button onClick={() => alert("Approved")} className="netflix-btn" style={{padding: '10px', width: 'auto'}}>Approve & Issue QR</button>
                    </div>
                ))}
            </div>
        )}

        {activeTab === 'logs' && (
            <div>
                {MOCK_HISTORY.map(log => (
                    <div key={log.id} className="glass-card" style={{padding: '15px', display: 'flex', justifyContent: 'space-between'}}>
                        <div>
                            <strong>{log.type}</strong>
                            <div style={{fontSize: '12px', color: '#aaa'}}>{log.date}</div>
                        </div>
                        <div style={{textAlign: 'right'}}>
                            <div style={{color: '#46d369'}}>EXIT LOGGED</div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}

export default OfficeDash;