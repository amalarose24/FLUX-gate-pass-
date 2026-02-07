import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

function WardenDash() {
  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  const [activeTab, setActiveTab] = useState('overdue');
  const [overdue, setOverdue] = useState([]);
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]); // Approval History
  
  // MY PASS
  const [myHistory, setMyHistory] = useState([]);
  const [formData, setFormData] = useState({ destination: 'Office', transport: 'none', seats: 0 });

  useEffect(() => {
    fetchData();
    fetchMyPass();
  }, [activeTab]);

  const fetchData = () => {
    axios.get('http://localhost:5000/api/pass/overdue').then(res => setOverdue(res.data));
    axios.get(`http://localhost:5000/api/pass/approver-data/${user._id}`).then(res => {
       setPending(res.data.pending);
       setHistory(res.data.history);
    });
  };
  const fetchMyPass = () => axios.get(`http://localhost:5000/api/pass/my-history/${user._id}`).then(res => setMyHistory(res.data));

  const handleDecision = (id, status) => {
    axios.put(`http://localhost:5000/api/pass/decide/${id}`, { status }).then(fetchData);
  };

  const handleRequest = () => {
    axios.post('http://localhost:5000/api/pass/create', {
        userId: user._id, reason: 'Official', destination: formData.destination, transportMode: formData.transport, seatsAvailable: formData.seats
    }).then(() => { alert("Sent to Office"); fetchMyPass(); });
  };

  return (
    <div className="fade-in">
      <Navbar />
      <div className="content-pad">
        <div className="tab-container">
           <button onClick={()=>setActiveTab('overdue')}>Monitor</button>
           <button onClick={()=>setActiveTab('approve')}>Approvals</button>
           <button onClick={()=>setActiveTab('mypass')}>My Pass</button>
        </div>

        {activeTab === 'overdue' && overdue.map(p => (
           <div key={p._id} className="glass-card" style={{borderLeft:'5px solid red'}}>
              <h3>{p.userId.name}</h3> <p>LATE RETURN</p>
           </div>
        ))}

        {activeTab === 'approve' && pending.map(req => (
           <div key={req._id} className="glass-card">
              <h4>{req.userId.name} &rarr; {req.destination}</h4>
              <button className="btn-sm btn-success" onClick={()=>handleDecision(req._id, 'approved')}>Approve</button>
              <button className="btn-sm btn-danger" onClick={()=>handleDecision(req._id, 'rejected')}>Reject</button>
           </div>
        ))}

        {activeTab === 'mypass' && (
           <div className="glass-card">
              <h3>Warden Pass</h3>
              <input className="netflix-input" placeholder="Destination" onChange={e=>setFormData({...formData, destination:e.target.value})} />
              
              <div style={{background:'#222', padding:'10px', marginTop:'10px'}}>
                 <p>Offer Ride?</p>
                 <button className="btn-sm" onClick={()=>setFormData({...formData, transport:'provider'})}>Yes</button>
                 <button className="btn-sm" onClick={()=>setFormData({...formData, transport:'none'})}>No</button>
                 {formData.transport === 'provider' && <input className="netflix-input" placeholder="Seats" onChange={e=>setFormData({...formData, seats:e.target.value})} />}
              </div>
              <button className="netflix-btn" onClick={handleRequest} style={{marginTop:'15px'}}>Submit</button>
           </div>
        )}
      </div>
    </div>
  );
}
export default WardenDash;