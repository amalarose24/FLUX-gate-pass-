import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { FaCoffee, FaHome, FaBus, FaCar } from 'react-icons/fa';
import DynamicQR from '../DynamicQR';
import Navbar from '../components/Navbar';
import LocationPicker from '../components/LocationPicker';
import toast from 'react-hot-toast';

const socket = io('http://localhost:5000');
const AUTO_DRIVERS = [{ name: "Raju", phone: "9998887771" }, { name: "Suresh", phone: "9998887772" }, { name: "Mani", phone: "9998887773" }];

function StudentDash() {
  const user = JSON.parse(localStorage.getItem('currentUser'));
  const [activeTab, setActiveTab] = useState('pass');
  const [passData, setPassData] = useState(null);
  const [history, setHistory] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [transportData, setTransportData] = useState({ providers: [], seekers: [] });
  const [showQr, setShowQr] = useState(true);
  const [passengers, setPassengers] = useState([]);

  const [form, setForm] = useState({ reason: 'Lunch', otherReason: '', dest: '', destCoords: null, advisor: '', transport: 'none', seats: 3, return: true, time: '' });
  const [tab, setTab] = useState('log');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendSystemNotification = (title, body) => { if (Notification.permission === 'granted') new Notification(title, { body, icon: '/vite.svg' }); };

  useEffect(() => {
    if (Notification.permission !== 'granted') Notification.requestPermission();
    socket.on(`notify-${user._id}`, (data) => { 
        sendSystemNotification(data.title, data.msg); 
        toast(data.title + ": " + data.msg, { icon: '🔔', duration: 5000 });
        fetchHistory(); 
    });
    socket.on('force-refresh-transport', () => { fetchHistory(); });
    const token = localStorage.getItem('token');
    axios.get(`http://localhost:5000/api/approvers`, { headers: { Authorization: `Bearer ${token}` } }).then(res => setAdvisors(res.data));
    fetchHistory();
    return () => { socket.off(`notify-${user._id}`); socket.off('force-refresh-transport'); };
  }, []);

  const fetchTransportMatches = (destination, coords) => {
    let url = `http://localhost:5000/api/transport/search?location=${destination}`;
    if (coords && coords.length === 2) url += `&lat=${coords[0]}&lng=${coords[1]}`;
    axios.get(url).then(r => setTransportData(r.data));
  };
  const fetchHistory = () => axios.get(`http://localhost:5000/api/pass/my-history/${user._id}`).then(res => {
    setHistory(res.data);
    const active = res.data.find(p => p.status === 'approved' || p.status === 'active' || p.status === 'pending');
    if (active) {
      setPassData(active);
      if (active.status === 'approved') fetchTransportMatches(active.destination, active.destCoords);

      // Fetch passengers if they are offering a ride
      if (active.transportMode === 'provider') {
        axios.get(`http://localhost:5000/api/transport/passengers/${active._id}`)
          .then(r => setPassengers(r.data));
      }
    } else setPassData(null);
  });
  const checkLocationAndSubmit = () => {
    if (!form.advisor) return toast.error("Select Approver");
    if (form.return && !form.time) return toast.error("Please specify return time.");

    setIsSubmitting(true);

    // Process "Other" fields safely
    const finalReason = form.reason === 'Other' ? form.otherReason : form.reason;
    const finalDest = form.dest;
    const seatsToSend = form.transport === 'provider' ? form.seats : 0;

    axios.post('http://localhost:5000/api/pass/create', { userId: user._id, assignedApproverId: form.advisor, reason: finalReason, destination: finalDest, isReturnable: form.return, requestedTime: form.time, transportMode: form.transport, seatsAvailable: seatsToSend, routeStops: [], destCoords: form.destCoords })
      .then(() => {
        toast.success("Request Sent!");
        fetchHistory();
      })
      .catch(err => {
        toast.error(err.response?.data?.msg || "Failed to send request.");
        console.error(err);
      })
      .finally(() => setIsSubmitting(false));
  };

  const bookSeat = (transportId) => {
    if (!passData) return;
    const token = localStorage.getItem('token');

    // Add seekerPassId to request body
    axios.put(`http://localhost:5000/api/transport/book/${transportId}`,
      { seekerPassId: passData._id },
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then(res => {
        toast.success("Seat Booked Successfully!");

        // Optimistically update UI so badge appears instantly
        setPassData({ ...passData, bookedRideId: transportId });

        if (passData && passData.status === 'approved') fetchTransportMatches(passData.destination, passData.destCoords);
      })
      .catch(err => toast.error(err.response?.data?.msg || "Failed to book seat"));
  };

  const handleCancelPass = (passId) => {
    const token = localStorage.getItem('token');
    axios.put(`http://localhost:5000/api/pass/user-cancel/${passId}`, {}, { headers: { Authorization: `Bearer ${token}` } })
      .then(() => {
        toast.success("Pass Cancelled");
        fetchHistory();
      })
      .catch(err => toast.error(err.response?.data?.msg || "Failed to cancel pass"));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <Navbar />

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-700 pt-28 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Welcome back, {user?.name.split(' ')[0] || 'Student'}!</h1>
          <p className="text-teal-100 mt-2 text-lg">Manage your gate passes and rides seamlessly.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 -mt-12 relative z-10 pb-12">
        {/* Sub-Tabs Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-slate-100 p-1.5 rounded-full flex gap-1 shadow-inner border border-slate-200">
            <button className={`px-6 py-2 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === 'pass' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('pass')}>Activity</button>
            <button className={`px-6 py-2 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === 'history' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('history')}>History</button>
          </div>
        </div>

        {activeTab === 'pass' && (
          <div className="space-y-6">
            {!passData ? (
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
                <h3 className="text-xl font-bold text-slate-800 mb-6">New Request</h3>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Reason</label>
                    <select className="w-full h-12 px-4 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-500 outline-none" onChange={e => setForm({ ...form, reason: e.target.value })}>
                      <option>Home</option><option>Lunch</option><option>Other</option>
                    </select>
                  </div>
                  {form.reason === 'Other' && (
                    <div>
                      <input className="w-full h-12 px-4 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Specify..." onChange={e => setForm({ ...form, otherReason: e.target.value })} />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Destination</label>
                    <div className="border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-teal-500 transition-all bg-slate-50">
                      <LocationPicker
                        value={form.dest}
                        onChange={(text) => setForm({ ...form, dest: text })}
                        onSelect={(coords) => setForm(prev => ({ ...prev, destCoords: coords }))}
                        placeholder="Search destination..."
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                    <label className="block text-sm font-bold text-slate-700 mb-3">Will you return?</label>
                    <div className="flex gap-2 mb-4">
                      <button className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${form.return ? 'bg-teal-500 text-white' : 'bg-white border border-slate-200 text-slate-600'}`} onClick={() => setForm({ ...form, return: true })}>YES</button>
                      <button className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${!form.return ? 'bg-slate-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`} onClick={() => setForm({ ...form, return: false })}>NO</button>
                    </div>
                    {form.return && (
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Return Time</label>
                        <input type="time" className="w-full h-12 px-4 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                    <label className="block text-sm font-bold text-slate-700 mb-3">Transport</label>
                    <div className="flex flex-wrap gap-2">
                      <button className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all border ${form.transport === 'provider' ? 'bg-teal-50 border-teal-500 text-teal-700' : 'bg-white border-slate-200 text-slate-600'}`} onClick={() => setForm({ ...form, transport: 'provider' })}>Offer Ride</button>
                      <button className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all border ${form.transport === 'seeker' ? 'bg-teal-50 border-teal-500 text-teal-700' : 'bg-white border-slate-200 text-slate-600'}`} onClick={() => setForm({ ...form, transport: 'seeker' })}>Need Ride</button>
                      <button className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all border ${form.transport === 'none' ? 'bg-teal-50 border-teal-500 text-teal-700' : 'bg-white border-slate-200 text-slate-600'}`} onClick={() => setForm({ ...form, transport: 'none' })}>None</button>
                    </div>
                    {form.transport === 'provider' && (
                      <input type="number" className="w-full mt-4 h-12 px-4 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Seats Available" value={form.seats} onChange={e => setForm({ ...form, seats: e.target.value })} />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Approver</label>
                    <select className="w-full h-12 px-4 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-500 outline-none" onChange={e => setForm({ ...form, advisor: e.target.value })}>
                      <option value="">Select Approver...</option>{advisors.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                    </select>
                  </div>

                  <button className="w-full h-12 mt-2 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-500/30 transition-all disabled:opacity-50" onClick={checkLocationAndSubmit} disabled={isSubmitting}>
                    {isSubmitting ? "Processing..." : "REQUEST PASS"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 text-center relative overflow-hidden max-w-md mx-auto">
                <div className={`absolute top-0 left-0 right-0 h-2 ${passData.status === 'approved' ? 'bg-teal-500' : passData.status === 'active' ? 'bg-cyan-500' : 'bg-amber-500'}`}></div>
                {!showQr ? (
                  <div className="py-6">
                    <h2 className={`text-2xl font-black mb-6 tracking-widest ${passData.status === 'approved' ? 'text-teal-600' : passData.status === 'active' ? 'text-cyan-600' : 'text-amber-500'}`}>{passData.status.toUpperCase()}</h2>
                    <button className="w-full h-12 rounded-xl bg-slate-800 text-white font-bold tracking-wide hover:bg-slate-900 transition-all" onClick={() => setShowQr(true)}>VIEW PASS QR</button>
                  </div>
                ) : (
                  <>
                    <h2 className={`text-2xl font-black mt-2 mb-6 tracking-widest ${passData.status === 'approved' ? 'text-teal-600' : passData.status === 'active' ? 'text-cyan-600' : 'text-amber-500'}`}>{passData.status.toUpperCase()}</h2>
                    {(passData.status === 'approved' || passData.status === 'active') && (
                      <div className="bg-white p-4 rounded-2xl inline-block shadow-sm border border-slate-100 mb-6 mx-auto">
                        <DynamicQR
                          passId={passData._id}
                          userToken={localStorage.getItem('token')}
                        />
                      </div>
                    )}
                    {passData.status === 'pending' && <p className="text-amber-500 font-bold mb-6">Waiting for Approval...</p>}

                    {passData.transportMode === 'provider' && (
                      <div className="mt-6 text-left border-t border-slate-100 pt-6">
                        <span className="text-sm font-bold text-teal-600 uppercase tracking-widest block mb-4">My Passengers</span>
                        {passengers.length === 0 && <p className="text-slate-500 text-sm">No passengers have joined your ride yet.</p>}
                        <div className="space-y-3">
                          {passengers.map(psg => (
                            <div key={psg._id} className="bg-slate-50 p-4 rounded-xl border-l-4 border-l-teal-500 flex justify-between items-center">
                              <div>
                                <strong className="text-slate-800 block">{psg.userId.name}</strong>
                                <div className="text-slate-500 text-xs">To {psg.destination}</div>
                              </div>
                              <a className="text-teal-600 border border-teal-200 hover:bg-teal-50 px-4 py-2 rounded-lg text-xs font-bold transition-all inline-block" href={`tel:${psg.userId.parentPhone}`}>CALL</a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {passData.status === 'approved' && passData.transportMode !== 'provider' && (
                      <div className="mt-6 text-left border-t border-slate-100 pt-6">
                        <span className="text-sm font-bold text-teal-600 uppercase tracking-widest block mb-4">Available Lifts</span>
                        {transportData.providers.length === 0 && <p className="text-slate-500 text-sm">No lifts found.</p>}
                        <div className="space-y-3">
                          {transportData.providers.filter(p => p.userId && (p.seatsAvailable > 0 || passData.bookedRideId === p._id) && String(p.userId._id) !== String(user._id)).map(p => {
                            const isMyRide = passData.bookedRideId === p._id;

                            return (
                              <div key={p._id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center transition-all hover:border-teal-300">
                                <div>
                                  <strong className="text-slate-800 block">{p.userId.name}</strong>
                                  <div className="text-slate-500 text-xs my-0.5">Seats: <span className="font-bold text-teal-600">{p.seatsAvailable}</span></div>
                                  <div className="text-slate-500 text-xs">To {p.destination}</div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  {isMyRide && <span className="bg-teal-100 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">✅ SECURED</span>}
                                  <div className="flex gap-2">
                                    {!passData.bookedRideId && p.seatsAvailable > 0 && (
                                      <button onClick={() => {
                                        const token = localStorage.getItem('token');
                                        axios.put(`http://localhost:5000/api/transport/book/${p._id}`,
                                          { seekerPassId: passData._id },
                                          { headers: { Authorization: `Bearer ${token}` } }
                                        ).then(() => {
                                          toast.success("Seat Booked Successfully!");
                                          setPassData({ ...passData, bookedRideId: p._id });
                                          fetchTransportMatches(passData.destination);
                                        }).catch(err => toast.error(err.response?.data?.msg || "Failed to book seat"));
                                      }} className="bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all">BOOK SEAT</button>
                                    )}
                                    <a href={`tel:${p.userId.parentPhone}`} className="text-slate-600 border border-slate-300 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-block">CALL</a>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {passData.transportMode === 'seeker' && (
                          <div className="mt-8">
                            <span className="text-sm font-bold text-blue-500 uppercase tracking-widest block mb-4">Share Auto</span>
                            {transportData.seekers.filter(s => s.userId && String(s.userId._id) !== String(user._id)).length === 0 && <p className="text-slate-500 text-sm mb-4">No co-passengers.</p>}
                            <div className="space-y-3 mb-8">
                              {transportData.seekers.filter(s => s.userId && String(s.userId._id) !== String(user._id)).map(s => (
                                <div key={s._id} className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex justify-between items-center">
                                  <span className="text-slate-700 font-medium text-sm">{s.userId.name}</span>
                                  <a href={`tel:${s.userId.parentPhone}`} className="text-blue-600 font-bold text-xs uppercase hover:underline">CONNECT</a>
                                </div>
                              ))}
                            </div>
                            <span className="text-sm font-bold text-amber-500 uppercase tracking-widest block mb-4">Auto Drivers</span>
                            <div className="space-y-2">
                              {AUTO_DRIVERS.map(a => (
                                <div key={a.name} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-amber-200 transition-colors">
                                  <span className="text-slate-700 font-medium text-sm">{a.name}</span>
                                  <span className="text-slate-600 font-mono text-sm">{a.phone}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <button className="w-full mt-8 h-12 rounded-xl bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 transition-colors" onClick={() => setShowQr(false)}>HIDE PASS</button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Pass History</h3>
            <div className="space-y-4">
              {history.length === 0 && <p className="text-slate-500">No history found.</p>}
              {history.map(p => (
                <div key={p._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="mb-3 sm:mb-0">
                    <div className="font-bold text-slate-800">{p.destination}</div>
                    <div className="text-slate-500 text-sm my-1">{new Date(p.createdAt).toLocaleDateString()}</div>
                    <div className="text-xs text-slate-400 font-mono">
                      {p.outTime && <span className="mr-2">OUT: {new Date(p.outTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                      {p.actualReturnTime && <span>IN: {new Date(p.actualReturnTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                    </div>
                    {p.status === 'rejected' && <div className="text-rose-500 text-xs mt-2 font-bold bg-rose-50 inline-block px-2 py-1 rounded">Reason: {p.rejectionReason}</div>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${p.status === 'approved' ? 'bg-teal-100 text-teal-700' :
                        p.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                          p.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                            p.status === 'active' ? 'bg-cyan-100 text-cyan-700' :
                              p.status === 'overdue' ? 'bg-amber-100 text-amber-700' :
                                p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-slate-100 text-slate-700'
                      }`}>{p.status}</span>
                    {p.status === 'pending' && (
                      <button onClick={() => handleCancelPass(p._id)} className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-rose-200 mt-2">Cancel Pass</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default StudentDash;