import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import DynamicQR from '../DynamicQR';
import Navbar from '../components/Navbar';
import LocationPicker from '../components/LocationPicker';
import toast from 'react-hot-toast';

import { FaCoffee, FaHome, FaBus, FaCar } from 'react-icons/fa';
const socket = io('http://localhost:5000');
const AUTO_DRIVERS = [{ name: "Raju", phone: "9998887771" }, { name: "Suresh", phone: "9998887772" }, { name: "Mani", phone: "9998887773" }];

function NonTeachingDash() {
  const user = JSON.parse(localStorage.getItem('currentUser'));
  const [activeTab, setActiveTab] = useState('pass');
  const [activePass, setActivePass] = useState(null);
  const [showQr, setShowQr] = useState(true);
  const [transportData, setTransportData] = useState({ providers: [], seekers: [] });
  const [passengers, setPassengers] = useState([]);
  const [myHistory, setMyHistory] = useState([]);
  const [form, setForm] = useState({ reason: 'Personal', otherReason: '', dest: '', destCoords: null, transport: 'none', seats: 3, return: true, time: '' });

  const sendSystemNotification = (title, body) => { if (Notification.permission === 'granted') new Notification(title, { body, icon: '/vite.svg' }); };

  useEffect(() => {
    if (Notification.permission !== 'granted') Notification.requestPermission();
    socket.on(`notify-${user._id}`, (data) => { 
        sendSystemNotification(data.title, data.msg); 
        toast(data.title + ": " + data.msg, { icon: '🔔', duration: 5000 });
        refreshLog(); 
    });
    socket.on('force-refresh-transport', () => { if (activePass && activePass.status === 'approved') fetchTransportMatches(activePass.destination, activePass.destCoords); });
    refreshLog();

    if (activePass && activePass.transportMode === 'provider' && (activePass.status === 'approved' || activePass.status === 'active')) {
      const token = localStorage.getItem('token');
      axios.get(`http://localhost:5000/api/transport/passengers/${activePass._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setPassengers(res.data)).catch(console.error);
    }

    return () => { socket.off(`notify-${user._id}`); socket.off('force-refresh-transport'); };
  }, [activePass]);

  const fetchTransportMatches = (destination, coords) => {
    let url = `http://localhost:5000/api/transport/search?location=${destination}`;
    if (coords && coords.length === 2) url += `&lat=${coords[0]}&lng=${coords[1]}`;
    axios.get(url).then(r => setTransportData(r.data));
  };
  const refreshLog = () => axios.get(`http://localhost:5000/api/pass/my-history/${user._id}`).then(res => { setMyHistory(res.data); const active = res.data.find(p => p.status === 'approved' || p.status === 'active' || p.status === 'pending'); if (active) { setActivePass(active); if (active.status === 'approved') fetchTransportMatches(active.destination, active.destCoords); } else setActivePass(null); });

  const submit = () => {
    if (!form.reason || !form.dest) return toast.error("Please fill all details");
    if (form.return && !form.time) return toast.error("Please specify return time.");

    const finalReason = form.reason === 'Other' ? form.otherReason : form.reason;
    const finalDest = form.dest;
    const seatsToSend = form.transport === 'provider' ? form.seats : 0;

    axios.post('http://localhost:5000/api/pass/create', { userId: user._id, reason: finalReason, destination: finalDest, isReturnable: form.return, requestedTime: form.time, transportMode: form.transport, seatsAvailable: seatsToSend, routeStops: [], destCoords: form.destCoords })
      .then(() => {
        toast.success("Sent to Office");
        refreshLog();
      })
      .catch(err => toast.error("Failed to send pass request."));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <Navbar />
      
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-700 pt-28 pb-20 px-6">
          <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Welcome back, {user.name}</h1>
              <p className="text-teal-100 mt-2 text-lg font-medium">{user.role.toUpperCase()} DASHBOARD</p>
          </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-12 relative z-10 pb-12">
        {/* Sub-Tabs Toggle */}
        <div className="flex justify-center mb-8">
            <div className="bg-slate-100 p-1.5 rounded-full flex gap-1 shadow-inner border border-slate-200">
                <button className={`px-6 py-2 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === 'pass' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('pass')}>My Pass</button>
                <button className={`px-6 py-2 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === 'history' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('history')}>History</button>
            </div>
        </div>

        {activeTab === 'pass' && (
          <>
            {!activePass ? (
              <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-100">
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">📝 New Pass Request</h3>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">Purpose</label>
                    <select className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-slate-700 font-medium" onChange={e => setForm({ ...form, reason: e.target.value })}>
                      <option>Personal</option>
                      <option>Official Duty</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">Destination</label>
                    <div className="relative">
                      <LocationPicker
                        value={form.dest}
                        onChange={(text) => setForm({ ...form, dest: text })}
                        onSelect={(coords) => setForm(prev => ({ ...prev, destCoords: coords }))}
                        placeholder="Search destination..."
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                    <label className="block text-sm font-bold text-slate-600 mb-3 uppercase tracking-wide">Will you return?</label>
                    <div className="flex gap-3 mb-4">
                      <button className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${form.return ? 'bg-teal-500 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`} onClick={() => setForm({ ...form, return: true })}>YES</button>
                      <button className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${!form.return ? 'bg-rose-500 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`} onClick={() => setForm({ ...form, return: false })}>NO</button>
                    </div>
                    {form.return && (
                      <div className="mt-4">
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Return Time</label>
                        <input type="time" className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-slate-700 font-medium" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-3 uppercase tracking-wide">Transport Options</label>
                    <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3">
                      <button className={`flex-1 min-w-[100px] py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${form.transport === 'provider' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`} onClick={() => setForm({ ...form, transport: 'provider' })}><FaCar /> Offer Ride</button>
                      <button className={`flex-1 min-w-[100px] py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${form.transport === 'seeker' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`} onClick={() => setForm({ ...form, transport: 'seeker' })}><FaCar /> Find Ride</button>
                      <button className={`flex-1 min-w-[100px] py-3 rounded-xl font-bold text-sm border transition-colors ${form.transport === 'none' ? 'bg-slate-700 text-white shadow-md border-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`} onClick={() => setForm({ ...form, transport: 'none' })}>None</button>
                    </div>
                    {form.transport === 'provider' && (
                      <div className="mt-4 animate-fade-in">
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Seats Available</label>
                        <input type="number" className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-700 font-medium" placeholder="E.g., 3" value={form.seats} onChange={e => setForm({ ...form, seats: e.target.value })} />
                      </div>
                    )}
                  </div>
                  
                  <button className="w-full h-14 mt-4 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-teal-500/25 flex items-center justify-center gap-2 text-lg" onClick={submit}>SUBMIT REQUEST</button>
                </div>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 text-center relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-2 ${activePass.status === 'approved' ? 'bg-emerald-500' : activePass.status === 'active' ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
                
                {!showQr ? (
                  <div className="py-8">
                    <h2 className={`text-2xl font-black tracking-widest mb-6 ${activePass.status === 'approved' ? 'text-emerald-500' : activePass.status === 'active' ? 'text-blue-500' : 'text-amber-500'}`}>{activePass.status.toUpperCase()}</h2>
                    <button className="h-12 px-8 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors shadow-md" onClick={() => setShowQr(true)}>VIEW PASS QR</button>
                  </div>
                ) : (
                  <>
                    <h2 className={`text-2xl font-black tracking-widest mt-4 mb-6 ${activePass.status === 'approved' ? 'text-emerald-500' : activePass.status === 'active' ? 'text-blue-500' : 'text-amber-500'}`}>{activePass.status.toUpperCase()}</h2>

                    {(activePass.status === 'approved' || activePass.status === 'active') && (
                      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 inline-block mb-6">
                        <DynamicQR passId={activePass._id} userToken={localStorage.getItem('token')} />
                      </div>
                    )}

                    {activePass.status === 'pending' && (
                      <div className="py-12">
                        <div className="w-16 h-16 border-4 border-slate-100 border-t-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-400 font-medium italic">Waiting for Approval...</p>
                      </div>
                    )}

                    {activePass.transportMode === 'provider' && (
                      <div className="mt-8 text-left border-t border-slate-100 pt-8">
                        <h4 className="text-teal-600 font-bold uppercase tracking-widest text-sm mb-4">My Passengers</h4>
                        {passengers.length === 0 && <p className="text-slate-400 text-sm italic bg-slate-50 p-4 rounded-xl text-center">No passengers have joined your ride yet.</p>}
                        <div className="space-y-3">
                          {passengers.map(psg => (
                            <div key={psg._id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm border-l-4 border-l-teal-500 flex justify-between items-center">
                              <div>
                                <strong className="text-slate-800 block text-lg">{psg.userId.name}</strong>
                                <div className="text-slate-500 text-sm font-medium mt-1">To {psg.destination}</div>
                              </div>
                              <a href={`tel:${psg.userId.parentPhone}`} className="px-4 py-2 border-2 border-teal-500 text-teal-600 font-bold rounded-lg hover:bg-teal-50 transition-colors text-sm">CALL</a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activePass.status === 'approved' && activePass.transportMode !== 'provider' && (
                      <div className="mt-8 text-left border-t border-slate-100 pt-8">
                        <div className="flex items-center gap-2 mb-4">
                          <h4 className="flex-1 text-teal-600 font-bold uppercase tracking-widest text-sm">Available Lifts</h4>
                          <span className="text-xs font-bold bg-teal-100 text-teal-700 px-2 py-1 rounded-md">{transportData.providers.filter(p => String(p.userId?._id) !== String(user._id)).length} Found</span>
                        </div>
                        
                        {transportData.providers.filter(p => p.userId && String(p.userId._id) !== String(user._id)).length === 0 && (
                          <p className="text-slate-400 text-sm italic bg-slate-50 p-4 rounded-xl text-center mb-6">No rides currently available for this route.</p>
                        )}
                        
                        <div className="space-y-3 mb-8">
                          {transportData.providers.filter(p => p.userId && String(p.userId._id) !== String(user._id) && (p.seatsAvailable > 0 || activePass.bookedRideId === p._id)).map(p => {
                            const isMyRide = activePass.bookedRideId === p._id;
                            const hasBookedAnother = activePass.bookedRideId && activePass.bookedRideId !== p._id;

                            return (
                              <div key={p._id} className={`p-4 rounded-xl border transition-all flex justify-between items-center ${isMyRide ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-teal-300 hover:shadow-md'}`}>
                                <div>
                                  <strong className="text-slate-800 text-lg block">{p.userId.name}</strong>
                                  <div className="flex gap-3 mt-1 text-sm font-medium">
                                    <span className={isMyRide ? 'text-emerald-600' : 'text-slate-500'}>Seats: {p.seatsAvailable}</span>
                                    <span className="text-slate-400">|</span>
                                    <span className="text-slate-600">To {p.destination}</span>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2 items-end">
                                  {isMyRide && <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">✅ SECURED</span>}
                                  
                                  <div className="flex gap-2">
                                    <a href={`tel:${p.userId.parentPhone}`} className="px-4 py-2 border-2 border-teal-500 text-teal-600 font-bold rounded-lg hover:bg-teal-50 transition-colors text-xs text-center">CALL</a>
                                    
                                    {!activePass.bookedRideId && p.seatsAvailable > 0 && (
                                      <button onClick={() => {
                                        const token = localStorage.getItem('token');
                                        axios.put(`http://localhost:5000/api/transport/book/${p._id}`,
                                          { seekerPassId: activePass._id },
                                          { headers: { Authorization: `Bearer ${token}` } }
                                        ).then(() => {
                                          toast.success("Seat Booked Successfully!");
                                          fetchTransportMatches(activePass.destination);
                                          setActivePass(prev => ({ ...prev, bookedRideId: p._id }));
                                        }).catch(err => toast.error(err.response?.data?.msg || "Failed to book seat"));
                                      }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm text-xs">BOOK</button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {activePass.transportMode === 'seeker' && (
                          <>
                            <h4 className="text-indigo-600 font-bold uppercase tracking-widest text-sm mb-4 mt-8">Share Auto</h4>
                            {transportData.seekers.filter(s => s.userId && String(s.userId._id) !== String(user._id)).length === 0 && <p className="text-slate-400 text-sm italic bg-slate-50 p-4 rounded-xl text-center mb-6">No co-passengers found.</p>}
                            <div className="space-y-3 mb-8">
                              {transportData.seekers.filter(s => s.userId && String(s.userId._id) !== String(user._id)).map(s => (
                                <div key={s._id} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl">
                                  <span className="font-bold text-slate-700">{s.userId.name}</span>
                                  <a href={`tel:${s.userId.parentPhone}`} className="text-indigo-600 font-bold text-sm hover:text-indigo-700">CONNECT</a>
                                </div>
                              ))}
                            </div>
                            
                            <h4 className="text-amber-600 font-bold uppercase tracking-widest text-sm mb-4 mt-8">Auto Drivers</h4>
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                              {AUTO_DRIVERS.map(a => (
                                <div key={a.name} className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors">
                                  <span className="font-bold text-slate-700">{a.name}</span> 
                                  <span className="text-slate-500 font-medium font-mono bg-slate-100 px-3 py-1 rounded-md">{a.phone}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <button className="mt-8 h-12 w-full sm:w-auto px-8 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors" onClick={() => setShowQr(false)}>HIDE PASS</button>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* PERSONAL HISTORY */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
            {myHistory.length === 0 && <p className="text-slate-400 italic p-8 text-center bg-slate-50">No pass history found.</p>}
            {myHistory.map(p => (
              <div key={p._id} className="p-4 sm:p-5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="font-bold text-slate-800 text-lg mb-1">{p.destination}</div>
                  <div className="text-sm font-medium text-slate-500 mb-2">{new Date(p.createdAt).toLocaleDateString()}</div>
                  <div className="text-xs text-slate-400 font-medium">
                    {p.outTime && <span className="mr-3">OUT: {new Date(p.outTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                    {p.actualReturnTime && <span>IN: {new Date(p.actualReturnTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                  </div>
                  {p.status === 'rejected' && <div className="text-sm text-rose-500 mt-2 font-bold bg-rose-50 px-3 py-1 rounded-md inline-block">Reason: {p.rejectionReason}</div>}
                </div>
                <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide border
                  ${p.status === 'approved' || p.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                    p.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-200' : 
                    p.status === 'overdue' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                    p.status === 'void' ? 'bg-slate-50 text-slate-500 border-slate-200' : 
                    'bg-blue-50 text-blue-600 border-blue-200'}`}
                >
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export default NonTeachingDash;