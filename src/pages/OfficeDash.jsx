import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

function OfficeDash() {
  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    axios.get(`http://localhost:5000/api/pass/approver-data/${user._id}`).then(res => {
       setPending(res.data.pending);
       setHistory(res.data.history);
    });
  }, []);

  const handleDecision = (id, status) => {
    axios.put(`http://localhost:5000/api/pass/decide/${id}`, { status }).then(() => window.location.reload());
  };

  return (
    <div className="fade-in">
      <Navbar />
      <div className="content-pad">
         <h3>Admin Office (Faculty/Staff Approvals)</h3>
         
         {pending.length === 0 && <p>No Pending Requests.</p>}
         {pending.map(req => (
            <div key={req._id} className="glass-card">
               <h4>{req.userId.name} ({req.userRole})</h4>
               <p>{req.reason} - {req.destination}</p>
               <button className="btn-sm btn-success" onClick={()=>handleDecision(req._id, 'approved')}>Approve</button>
               <button className="btn-sm btn-danger" onClick={()=>handleDecision(req._id, 'rejected')}>Reject</button>
            </div>
         ))}

         <h4 style={{marginTop:'20px'}}>History</h4>
         {history.map(req => (
            <div key={req._id} style={{padding:'10px', borderBottom:'1px solid #333'}}>
               {req.userId.name} - {req.status}
            </div>
         ))}
      </div>
    </div>
  );
}
export default OfficeDash;