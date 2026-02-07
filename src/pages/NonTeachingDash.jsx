import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

function NonTeachingDash() {
  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  const [history, setHistory] = useState([]);
  const [formData, setFormData] = useState({
    reason: 'Personal', destination: 'Main Gate', transport: 'none', seats: 0
  });

  useEffect(() => {
    axios.get(`http://localhost:5000/api/pass/my-history/${user._id}`).then(res => setHistory(res.data));
  }, []);

  const handleSubmit = () => {
    axios.post('http://localhost:5000/api/pass/create', {
      userId: user._id, ...formData, 
      rideRoute: formData.transport==='provider' ? [formData.destination] : []
    }).then(() => { alert("Sent to Office"); window.location.reload(); });
  };

  return (
    <div className="fade-in">
      <Navbar />
      <div className="content-pad">
        <div className="glass-card">
           <h3>Staff Pass</h3>
           <label>Reason</label>
           <select className="netflix-input" onChange={e=>setFormData({...formData, reason:e.target.value})}>
             <option>Personal</option><option>Early Exit</option>
           </select>
           
           <div style={{background:'#222', padding:'10px', marginTop:'10px'}}>
              <p>Have Vehicle?</p>
              <button className="btn-sm" onClick={()=>setFormData({...formData, transport:'provider'})}>Yes, Offer Ride</button>
              <button className="btn-sm" onClick={()=>setFormData({...formData, transport:'none'})}>No</button>
              {formData.transport === 'provider' && <input className="netflix-input" placeholder="Seats" onChange={e=>setFormData({...formData, seats:e.target.value})} />}
           </div>

           <button className="netflix-btn" onClick={handleSubmit} style={{marginTop:'15px'}}>Request</button>
        </div>

        <h3>History</h3>
        {history.map(p => (
          <div key={p._id} className="glass-card" style={{borderLeft: p.status==='approved'?'4px solid green':'4px solid orange'}}>
             {p.reason} - {p.status}
          </div>
        ))}
      </div>
    </div>
  );
}
export default NonTeachingDash;