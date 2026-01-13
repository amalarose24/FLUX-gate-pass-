import { useState } from 'react';
import { GLOBAL_LOGS } from '../mockData'; 
import FacultyDash from './FacultyDash';   
import Navbar from '../components/Navbar';

function ApproverDash({ role }) {
  const [activeTab, setActiveTab] = useState('requests'); 
  const [requests, setRequests] = useState(GLOBAL_LOGS);
  
  // NEW: State for History
  const [historyLog, setHistoryLog] = useState([
      { id: 901, name: "Rahul M", type: "Home", status: "Approved", time: "Yesterday" },
      { id: 902, name: "Sneha P", type: "Lunch", status: "Rejected", time: "Yesterday" }
  ]);

  const handleAction = (req, status) => {
    // 1. Remove from Pending
    setRequests(requests.filter(r => r.id !== req.id));
    
    // 2. Add to History
    const newLog = { ...req, status: status, time: 'Just Now' };
    setHistoryLog([newLog, ...historyLog]);
    
    alert(`Request ${status}!`);
  };

  return (
    <div className="fade-in">
      <Navbar />

      <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
        
        <div style={{ marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
            <h2 style={{ color: '#00e5ff', margin: 0 }}>{role} Dashboard</h2>
            <p style={{ color: '#b3b3b3', fontSize: '14px' }}>Approve Students & Manage Personal Pass</p>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', overflowX: 'auto' }}>
            <span onClick={() => setActiveTab('requests')} style={{ cursor: 'pointer', color: activeTab === 'requests' ? 'white' : '#737373', fontWeight: 'bold', borderBottom: activeTab === 'requests' ? '2px solid #00e5ff' : 'none', whiteSpace: 'nowrap' }}>Pending Requests</span>
            <span onClick={() => setActiveTab('history')} style={{ cursor: 'pointer', color: activeTab === 'history' ? 'white' : '#737373', fontWeight: 'bold', borderBottom: activeTab === 'history' ? '2px solid #00e5ff' : 'none', whiteSpace: 'nowrap' }}>Approval History</span>
            <span onClick={() => setActiveTab('mypass')} style={{ cursor: 'pointer', color: activeTab === 'mypass' ? 'white' : '#737373', fontWeight: 'bold', borderBottom: activeTab === 'mypass' ? '2px solid #00e5ff' : 'none', whiteSpace: 'nowrap' }}>My Personal Pass</span>
        </div>

        {/* 1. PENDING REQUESTS */}
        {activeTab === 'requests' && (
            <div>
                {requests.length === 0 ? <p style={{color: '#777'}}>No pending requests.</p> : null}
                
                {requests.map((req) => (
                    <div key={req.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <strong style={{ fontSize: '18px' }}>{req.name}</strong>
                            <div style={{ color: '#b3b3b3' }}>{req.type} • {req.time}</div>
                            {req.willReturn && <div style={{fontSize: '12px', color: '#00e5ff'}}>Return by: {req.returnTime}</div>}
                        </div>
                        <div style={{display: 'flex', gap: '5px'}}>
                            <button onClick={() => handleAction(req, 'Approved')} style={{ background: '#46d369', color: 'black', border: 'none', padding: '8px 12px', borderRadius: '4px', fontWeight: 'bold' }}>✓</button>
                            <button onClick={() => handleAction(req, 'Rejected')} style={{ background: '#e50914', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', fontWeight: 'bold' }}>✕</button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* 2. HISTORY LOG (NEW) */}
        {activeTab === 'history' && (
            <div>
                {historyLog.map((log) => (
                    <div key={log.id} className="glass-card" style={{ padding: '15px', borderLeft: log.status === 'Approved' ? '4px solid #46d369' : '4px solid #e50914' }}>
                        <div style={{display: 'flex', justifyContent: 'space-between'}}>
                             <strong>{log.name}</strong>
                             <span style={{ color: log.status === 'Approved' ? '#46d369' : '#e50914', fontWeight: 'bold', fontSize: '12px' }}>
                                 {log.status.toUpperCase()}
                             </span>
                        </div>
                        <p style={{ margin: '5px 0', fontSize: '13px', color: '#ccc' }}>{log.type} • {log.time}</p>
                    </div>
                ))}
            </div>
        )}

        {/* 3. MY PERSONAL PASS */}
        {activeTab === 'mypass' && (
             <div style={{border: '1px solid #333', borderRadius: '10px', background: '#111'}}>
                 <FacultyDash disableNav={true} /> 
             </div>
        )}
      </div>
    </div>
  );
}

export default ApproverDash;