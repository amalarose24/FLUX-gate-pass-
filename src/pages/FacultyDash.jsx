import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

function FacultyDash() {
  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  // If user is Advisor, default to Approve, else My Pass
  const [activeTab, setActiveTab] = useState(user.advisorBatch ? 'approve' : 'mypass');
  
  const [pending, setPending] = useState([]);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectId, setRejectId] = useState(null);
  const [approvedHistory, setApprovedHistory] = useState([]); // History of whom I approved

  // MY PASS
  const [myHistory, setMyHistory] = useState([]);
  const [formData, setFormData] = useState({
    reason: 'Official', otherReason: '', destination: 'Office', transport: 'none', seats: 0, willReturn: true
  });

  useEffect(() => {
    if(user.advisorBatch) fetchApproverData();
    fetchMyHistory();
  }, []);

  const fetchApproverData = () => {
    axios.get(`http://localhost:5000/api/pass/approver-data/${user._id}`).then(res => {
      setPending(res.data.pending);
      setApprovedHistory(res.data.history);
    });
  };
  const fetchMyHistory = () => axios.get(`http://localhost:5000/api/pass/my-history/${user._id}`).then(res => setMyHistory(res.data));

  const handleDecision = (id, status) => {
    if(status === 'rejected' && !rejectReason) return alert("Enter Rejection Reason");
    axios.put(`http://localhost:5000/api/pass/decide/${id}`, { status, reason: rejectReason }).then(() => {
      setRejectId(null); setRejectReason(""); fetchApproverData();
    });
  };

  const handleRequest = () => {
    const finalReason = formData.reason === 'Other' ? formData.otherReason : formData.reason;
    axios.post('http://localhost:5000/api/pass/create', {
        userId: user._id, 
        reason: finalReason, 
        destination: formData.destination,
        isReturnable: formData.willReturn,
        transportMode: formData.transport,
        seatsAvailable: formData.seats
    }).then(() => { alert("Log Sent to Office"); fetchMyHistory(); });
  };

  return (
    <div className="fade-in">
      <Navbar />
      <div className="content-pad">
        <div className="tab-container">
           {user.advisorBatch && <button onClick={()=>setActiveTab('approve')}>Approve</button>}
           {user.advisorBatch && <button onClick={()=>setActiveTab('appr_history')}>Approve History</button>}
           <button onClick={()=>setActiveTab('mypass')}>My Pass / Log</button>
        </div>

        {/* APPROVE TAB */}
        {activeTab === 'approve' && pending.map(req => (
          <div key={req._id} className="glass-card">
             <h4>{req.userId.name} &rarr; {req.destination}</h4>
             <p>{req.reason} {req.isReturnable ? '(Returning)' : '(No Return)'}</p>
             {rejectId === req._id ? (
                <div>
                   <input className="netflix-input" placeholder="Reason..." onChange={e=>setRejectReason(e.target.value)} />
                   <button className="btn-sm btn-danger" onClick={()=>handleDecision(req._id, 'rejected')}>Confirm</button>
                </div>
             ) : (
                <div>
                   <button className="btn-sm btn-success" onClick={()=>handleDecision(req._id, 'approved')}>Approve</button>
                   <button className="btn-sm btn-danger" onClick={()=>setRejectId(req._id)}>Reject</button>
                </div>
             )}
          </div>
        ))}

        {/* APPROVAL HISTORY */}
        {activeTab === 'appr_history' && approvedHistory.map(req => (
           <div key={req._id} className="glass-card" style={{opacity:0.7}}>
              {req.userId.name} - {req.status}
           </div>
        ))}

        {/* MY PASS TAB (LOG TIME) */}
        {activeTab === 'mypass' && (
           <div className="glass-card">
              <h3>Log Movement</h3>
              
              <label>Reason</label>
              <select className="netflix-input" onChange={e=>setFormData({...formData, reason:e.target.value})}>
                 <option>Official</option><option>Personal</option><option>Other</option>
              </select>
              {formData.reason === 'Other' && <input className="netflix-input" placeholder="Specify" onChange={e=>setFormData({...formData, otherReason:e.target.value})} />}

              <div style={{margin:'15px 0', background:'#222', padding:'10px'}}>
                 <p>Will you return today?</p>
                 <button className={`btn-sm ${formData.willReturn?'active':''}`} onClick={()=>setFormData({...formData, willReturn:true})}>Yes (Log Entry/Exit)</button>
                 <button className={`btn-sm ${!formData.willReturn?'active':''}`} onClick={()=>setFormData({...formData, willReturn:false})}>No (Half Day Leave)</button>
              </div>

              <div style={{background:'#222', padding:'10px', marginTop:'10px'}}>
                 <p>Driving? Offer Pool?</p>
                 <button className="btn-sm" onClick={()=>setFormData({...formData, transport:'provider'})}>Yes</button>
                 <button className="btn-sm" onClick={()=>setFormData({...formData, transport:'none'})}>No</button>
                 {formData.transport === 'provider' && <input className="netflix-input" placeholder="Seats" onChange={e=>setFormData({...formData, seats:e.target.value})} />}
              </div>

              <button className="netflix-btn" onClick={handleRequest} style={{marginTop:'15px'}}>Submit Log</button>
              
              <h4>My Logs</h4>
              {myHistory.map(p => (
                 <div key={p._id} style={{borderBottom:'1px solid #333', padding:'5px'}}>
                    {p.destination} - <span style={{color: p.status==='Half Day Leave'?'orange':'#4caf50'}}>{p.status}</span>
                 </div>
              ))}
           </div>
        )}
      </div>
    </div>
  );
}
export default FacultyDash;