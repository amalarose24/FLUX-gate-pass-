import { useState } from 'react';
import Navbar from '../components/Navbar';

function AdvisorDash() {
  const [activeTab, setActiveTab] = useState('approve'); // 'approve' or 'request'
  
  // Tab 1 Data: Student Requests
  const [studentRequests, setStudentRequests] = useState([
    { id: 1, name: "Arjun (S6 CS)", type: "Lunch", time: "12:30 PM" },
    { id: 2, name: "Sneha (S4 EC)", type: "Medical", time: "10:00 AM" }
  ]);

  // Tab 2 Data: My Personal Requests (As Faculty)
  const [myStatus, setMyStatus] = useState(null);

  return (
    <div>
      <Navbar title="Advisor Panel" />
      
      <div className="content-pad">
        {/* Toggle Switch */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button 
            className={`btn ${activeTab === 'approve' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('approve')}>
            Approve Students
          </button>
          <button 
            className={`btn ${activeTab === 'request' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('request')}>
            My Gate Pass
          </button>
        </div>

        {/* VIEW 1: APPROVE STUDENTS */}
        {activeTab === 'approve' && (
          <div className="card">
            <h3>Student Requests</h3>
            {studentRequests.length === 0 ? <p style={{color:'#888'}}>No pending requests.</p> : (
              studentRequests.map(req => (
                <div key={req.id} style={{borderBottom:'1px solid #eee', padding:'10px 0'}}>
                  <div style={{fontWeight:'bold'}}>{req.name}</div>
                  <div style={{fontSize:'0.9rem', color:'#555'}}>{req.type} • {req.time}</div>
                  <div style={{display:'flex', gap:'10px', marginTop:'5px'}}>
                    <button className="btn btn-success" style={{padding:'5px'}}>Approve</button>
                    <button className="btn btn-danger" style={{padding:'5px'}}>Reject</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* VIEW 2: REQUEST MY OWN PASS (Identical to FacultyDash) */}
        {activeTab === 'request' && (
          <div className="card">
            <h3>Faculty Self-Request</h3>
            <p style={{fontSize:'0.9rem', color:'#666'}}>Request sent to: <strong>Administrative Office</strong></p>
            
            {!myStatus ? (
              <>
                <label>Reason</label>
                <select>
                  <option>Official Duty</option>
                  <option>Personal (Half Day)</option>
                  <option>Medical</option>
                </select>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setMyStatus("Pending Office Approval")}>
                  Submit Request
                </button>
              </>
            ) : (
              <div style={{textAlign:'center', padding:'20px', background:'#f0fff4', borderRadius:'8px', border:'1px solid #48bb78'}}>
                <h3 style={{color:'#2f855a'}}>Request Sent</h3>
                <p>Status: <strong>{myStatus}</strong></p>
                <button className="btn btn-secondary" onClick={() => setMyStatus(null)}>New Request</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdvisorDash;