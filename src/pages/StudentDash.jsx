import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import QRCode from 'react-qr-code';
import Navbar from '../components/Navbar';

const socket = io('http://localhost:5000');
const LOCATIONS = ["Angamaly", "Aluva", "Mookannoor", "Kalamassery", "Other"];

function StudentDash() {
  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  const [activeTab, setActiveTab] = useState('pass');
  const [history, setHistory] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  
  // FORM
  const [reason, setReason] = useState('Home');
  const [otherReason, setOtherReason] = useState('');
  const [destination, setDestination] = useState('Angamaly');
  const [otherDest, setOtherDest] = useState('');
  const [advisorId, setAdvisorId] = useState('');
  
  // DOUBLE SCAN
  const [willReturn, setWillReturn] = useState(false);
  const [returnTime, setReturnTime] = useState('');

  // TRANSPORT
  const [transport, setTransport] = useState('none');
  const [seats, setSeats] = useState(0);
  const [matches, setMatches] = useState({ matches: [], autos: [] });

  useEffect(() => {
    socket.on(`notify-${user._id}`, (data) => { alert(data.msg); fetchHistory(); });
    // Fetch Advisors for batch
    if(user.batch) axios.get(`http://localhost:5000/api/advisors/${user.batch}`).then(res => setAdvisors(res.data));
    fetchHistory();
  }, []);

  const fetchHistory = () => axios.get(`http://localhost:5000/api/pass/my-history/${user._id}`).then(res => setHistory(res.data));

  const handleTransportSearch = (dest) => {
    axios.get(`http://localhost:5000/api/transport/search?location=${dest}`).then(res => setMatches(res.data));
  };

  const handleSubmit = () => {
    const finalDest = destination === 'Other' ? otherDest : destination;
    const finalReason = reason === 'Other' ? otherReason : reason;
    
    if(!advisorId) return alert("Please Select an Advisor");

    axios.post('http://localhost:5000/api/pass/create', {
      userId: user._id, 
      assignedApproverId: advisorId,
      reason: finalReason, 
      destination: finalDest,
      isReturnable: willReturn,
      requestedTime: returnTime,
      transportMode: transport,
      seatsAvailable: transport==='provider' ? seats : 0
    }).then(() => { alert("Request Sent!"); setActiveTab('history'); fetchHistory(); });
  };

  return (
    <div className="fade-in">
      <Navbar />
      <div className="content-pad">
        <div className="tab-container">
           <button onClick={()=>setActiveTab('pass')} className={activeTab==='pass'?'active':''}>Request</button>
           <button onClick={()=>setActiveTab('history')} className={activeTab==='history'?'active':''}>History</button>
        </div>

        {activeTab === 'pass' && (
          <div className="glass-card">
            <h3>New Gate Pass</h3>
            
            {/* REASON */}
            <label>Reason</label>
            <select className="netflix-input" onChange={e=>setReason(e.target.value)}>
               <option>Home</option><option>Lunch</option><option>Other</option>
            </select>
            {reason === 'Other' && <input className="netflix-input" placeholder="Specify Reason" onChange={e=>setOtherReason(e.target.value)} />}

            {/* DESTINATION */}
            <label>Destination</label>
            <select className="netflix-input" onChange={e=>{setDestination(e.target.value); if(transport==='seeker') handleTransportSearch(e.target.value);}}>
               {LOCATIONS.map(l => <option key={l}>{l}</option>)}
            </select>
            {destination === 'Other' && <input className="netflix-input" placeholder="Enter Location" onChange={e=>{setOtherDest(e.target.value); if(transport==='seeker') handleTransportSearch(e.target.value);}} />}

            {/* RETURN LOGIC */}
            <div style={{margin:'15px 0', background:'#222', padding:'10px'}}>
               <p style={{margin:0}}>Will you come back?</p>
               <div style={{display:'flex', gap:'10px', marginTop:'5px'}}>
                  <button className={`btn-sm ${willReturn ? 'active':''}`} onClick={()=>setWillReturn(true)}>Yes</button>
                  <button className={`btn-sm ${!willReturn ? 'active':''}`} onClick={()=>setWillReturn(false)}>No</button>
               </div>
               {willReturn && (
                  <div style={{marginTop:'10px'}}>
                    <label>When?</label>
                    <input type="datetime-local" className="netflix-input" onChange={e=>setReturnTime(e.target.value)} />
                  </div>
               )}
            </div>

            {/* ADVISOR SELECT */}
            <label style={{color:'#00e5ff'}}>Select Advisor</label>
            <select className="netflix-input" onChange={e=>setAdvisorId(e.target.value)}>
               <option value="">-- Choose Advisor --</option>
               {advisors.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>

            {/* TRANSPORT */}
            <div style={{background:'#222', padding:'10px', borderRadius:'8px', marginTop:'10px'}}>
               <p>Transport</p>
               <div style={{display:'flex', gap:'10px'}}>
                 <button className={`btn-sm ${transport==='seeker'?'active':''}`} onClick={()=>{setTransport('seeker'); handleTransportSearch(destination==='Other'?otherDest:destination);}}>Find Ride</button>
                 <button className={`btn-sm ${transport==='provider'?'active':''}`} onClick={()=>setTransport('provider')}>Offer Ride</button>
               </div>
               
               {transport === 'seeker' && (
                 <div style={{marginTop:'10px'}}>
                    {matches.matches.length > 0 ? matches.matches.map(m => (
                       <div key={m._id} style={{color:'#4caf50'}}>🚗 {m.userId.name} - {m.userId.parentPhone}</div>
                    )) : <small>No pools found.</small>}
                    
                    <div style={{marginTop:'10px', borderTop:'1px solid #444', paddingTop:'5px'}}>
                      <small>Auto Drivers:</small>
                      {matches.autos.map(a => <div key={a.name}>🛺 {a.name}: {a.phone}</div>)}
                    </div>
                 </div>
               )}

               {transport === 'provider' && (
                  <input className="netflix-input" type="number" placeholder="Seats Available" onChange={e=>setSeats(e.target.value)} />
               )}
            </div>

            <button className="netflix-btn" style={{marginTop:'20px'}} onClick={handleSubmit}>Submit Request</button>
          </div>
        )}

        {activeTab === 'history' && history.map(p => (
           <div key={p._id} className="glass-card" style={{borderLeft: p.status==='approved'?'4px solid #4caf50':'4px solid red'}}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                 <strong>{p.destination}</strong> 
                 <span>{p.status}</span>
              </div>
              {p.transportMode === 'seeker' && p.status === 'approved' && (
                 <div style={{fontSize:'0.8rem', color:'#aaa', marginTop:'5px'}}>* View Transport details in Pass</div>
              )}
              {p.status === 'approved' && <div style={{background:'white', padding:'10px', textAlign:'center', marginTop:'10px'}}><QRCode value={p._id} size={100} /></div>}
              {p.status === 'rejected' && <p style={{color:'red'}}>Reason: {p.rejectionReason}</p>}
           </div>
        ))}
      </div>
    </div>
  );
}
export default StudentDash;