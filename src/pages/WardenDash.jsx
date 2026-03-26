import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import DynamicQR from '../DynamicQR';
import Navbar from '../components/Navbar';
import LocationPicker from '../components/LocationPicker';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import toast from 'react-hot-toast';

const socket = io('http://localhost:5000');

// 🎨 DEFINED COLOR PALETTE
const GENERAL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
const CHART_TEXT = '#94a3b8';

const STATUS_COLORS = { APPROVED: '#10b981', REJECTED: '#f43f5e', COMPLETED: '#3b82f6', OVERDUE: '#f59e0b', ACTIVE: '#06b6d4', PENDING: '#eab308', VOID: '#64748b' };

const getStatusChartColor = (statusName, index) => {
    return STATUS_COLORS[statusName?.toUpperCase()] || GENERAL_COLORS[index % GENERAL_COLORS.length];
};

const AUTO_DRIVERS = [{ name: "Raju", phone: "9998887771" }, { name: "Suresh", phone: "9998887772" }, { name: "Mani", phone: "9998887773" }];

function WardenDash() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const [activeTab, setActiveTab] = useState('analytics');

    // Data State
    const [analytics, setAnalytics] = useState(null);
    const [pending, setPending] = useState([]);
    const [approverHistory, setApprHistory] = useState([]);
    const [myHistory, setMyHistory] = useState([]);
    const [activePass, setActivePass] = useState(null);
    const [showQr, setShowQr] = useState(true);
    const [transportData, setTransportData] = useState({ providers: [], seekers: [] });
    const [passengers, setPassengers] = useState([]);

    // Search & Filter
    const [historySearch, setHistorySearch] = useState("");
    const [historyFilter, setHistoryFilter] = useState("all");

    // NEW STATES: Pagination & Filtering
    const [timeframe, setTimeframe] = useState('week');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [approvalSubTab, setApprovalSubTab] = useState('pending');
    const [movementSubTab, setMovementSubTab] = useState('new');

    // Form State
    const [form, setForm] = useState({ reason: 'Official Duty', otherReason: '', dest: '', destCoords: null, transport: 'none', seats: 3, return: true, time: '' });

    // Rejection State
    const [rejectId, setRejectId] = useState(null);
    const [rejectReason, setRejectReason] = useState("");

    const sendSystemNotification = (title, body) => { if (Notification.permission === 'granted') new Notification(title, { body, icon: '/vite.svg' }); };

    // Socket listeners — set up ONCE and never torn down until unmount
    useEffect(() => {
        if (Notification.permission !== 'granted') Notification.requestPermission();

        socket.on(`notify-${user._id}`, (data) => {
            sendSystemNotification(data.title, data.msg);
            toast(data.title + ": " + data.msg, { icon: '🔔', duration: 5000 });
            refreshLog();
            refreshApprovals();
        });

        socket.on('force-refresh-transport', () => {
            refreshLog();
        });

        return () => { socket.off(`notify-${user._id}`); socket.off('force-refresh-transport'); };
    }, []);

    // Data fetching — runs on mount and when activePass changes
    useEffect(() => {
        refreshApprovals();
        refreshLog();

        if (activePass && activePass.transportMode === 'provider' && (activePass.status === 'approved' || activePass.status === 'active')) {
            const token = localStorage.getItem('token');
            axios.get(`http://localhost:5000/api/transport/passengers/${activePass._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            }).then(res => setPassengers(res.data)).catch(console.error);
        }
    }, [activePass]);

    const fetchTransportMatches = (destination, coords) => {
        let url = `http://localhost:5000/api/transport/search?location=${destination}`;
        if (coords && coords.length === 2) url += `&lat=${coords[0]}&lng=${coords[1]}`;
        axios.get(url).then(r => setTransportData(r.data));
    };

    useEffect(() => {
        refreshApprovals();
    }, [timeframe, page]);

    const refreshApprovals = () => {
        const token = localStorage.getItem('token');
        axios.get(`http://localhost:5000/api/pass/approver-data/${user._id}?page=${page}&limit=50`, { headers: { Authorization: `Bearer ${token}` } }).then(res => { setPending(res.data.pending); setApprHistory(res.data.history); setTotalPages(Math.ceil(res.data.totalHistoryCount / 50) || 1); });
        axios.get(`http://localhost:5000/api/analytics?role=${user.role}&batch=${user.advisorBatch || user.batch || ''}&timeframe=${timeframe}&hostel=${user.hostel || ''}`).then(res => setAnalytics(res.data)).catch(console.error);
    };

    const refreshLog = () => {
        const token = localStorage.getItem('token');
        return axios.get(`http://localhost:5000/api/pass/my-history/${user._id}`, { headers: { Authorization: `Bearer ${token}` } }).then(res => {
            setMyHistory(res.data);
            const active = res.data.find(p => p.status === 'approved' || p.status === 'active' || p.status === 'pending');
            if (active) { setActivePass(active); if (active.status === 'approved') fetchTransportMatches(active.destination, active.destCoords); } else setActivePass(null);
        });
    };

    const decide = (id, status) => {
        if (status === 'rejected' && !rejectReason) return toast.error("Reason needed");

        const token = localStorage.getItem('token');
        const payload = {
            status,
            approverId: user._id,
            rejectReason: status === 'rejected' ? rejectReason : ''
        };

        axios.put(`http://localhost:5000/api/pass/decide/${id}`, payload, { headers: { Authorization: `Bearer ${token}` } })
            .then(() => {
                toast.success(`Pass ${status.toUpperCase()}`);
                setRejectReason('');
                setRejectId(null);
                refreshLog();
                refreshApprovals();
            })
            .catch(err => toast.error(err.response?.data?.msg || "Failed to decide on pass"));
    };

    const handleAdminOverride = (passId, action) => {
        const token = localStorage.getItem('token');
        axios.put(`http://localhost:5000/api/pass/admin-override/${passId}`, { action }, { headers: { Authorization: `Bearer ${token}` } })
            .then(() => { toast.success(action === 'force_complete' ? 'Pass Force Completed' : 'Pass Voided'); refreshLog(); refreshApprovals(); })
            .catch(err => toast.error(err.response?.data?.msg || 'Override failed'));
    };

    const handleApproveAll = () => {
        if (pending.length === 0) return toast.error("No pending requests");
        const ids = pending.map(p => p._id);
        const token = localStorage.getItem('token');
        axios.put('http://localhost:5000/api/pass/bulk-approve', { passIds: ids }, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => { toast.success(`${res.data.modifiedCount} passes approved!`); refreshLog(); refreshApprovals(); })
            .catch(err => toast.error(err.response?.data?.msg || "Bulk approve failed"));
    };

    const submit = () => {
        if (!form.reason || !form.dest) return toast.error("Please fill all details");
        if (form.return && !form.time) return toast.error("Please specify return time.");

        const finalReason = form.reason === 'Other' ? form.otherReason : form.reason;
        const finalDest = form.dest;
        const seatsToSend = form.transport === 'provider' ? form.seats : 0;

        const token = localStorage.getItem('token');
        axios.post('http://localhost:5000/api/pass/create', { userId: user._id, reason: finalReason, destination: finalDest, isReturnable: form.return, requestedTime: form.time, transportMode: form.transport, seatsAvailable: seatsToSend, routeStops: [], destCoords: form.destCoords }, { headers: { Authorization: `Bearer ${token}` } })
            .then(() => {
                toast.success("Log Sent");
                refreshLog();
            })
            .catch(() => toast.error("Failed to send log"));
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '12px', borderRadius: '6px', color: '#f8fafc', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '500' }}>
                        {`${payload[0].name} : `}<span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{payload[0].value}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    const groupedApproverHistory = approverHistory.filter(req => (historyFilter === 'all' || req.status === historyFilter) && req.userId.name.toLowerCase().includes(historySearch.toLowerCase())).reduce((groups, req) => { const date = new Date(req.createdAt).toLocaleDateString(); if (!groups[date]) groups[date] = []; groups[date].push(req); return groups; }, {});

    const exportToCSV = () => {
        const historyToExport = approverHistory && approverHistory.length > 0 ? approverHistory : [];
        if (historyToExport.length === 0) return toast.error("No history to export");

        const headers = ["Date", "Time", "Name", "Role", "Destination", "Reason", "Status"];

        const rows = historyToExport.map(req => {
            const dateObj = new Date(req.createdAt || req.updatedAt);
            const dateStr = `="${dateObj.toLocaleDateString()}"`;
            const timeStr = `="${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}"`;

            const safeDestination = `"${(req.destination || '').replace(/"/g, '""')}"`;
            const safeReason = `"${(req.reason || '').replace(/"/g, '""')}"`;

            return [
                dateStr,
                timeStr,
                req.userId?.name || 'Unknown',
                req.userRole || 'Unknown',
                safeDestination,
                safeReason,
                req.status
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const prefix = user?.role === 'warden' ? 'Warden' : 'Faculty';

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${prefix}_Log.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            <Navbar />

            {/* Hero Header */}
            <div className="bg-gradient-to-r from-teal-500 to-teal-700 pt-28 pb-20 px-6">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                        Welcome back, {user?.name?.split(' ')[0] || 'Warden'}
                    </h1>
                    <p className="text-teal-100 mt-2 text-lg font-medium">Manage approvals, analytics, and your gate passes.</p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 -mt-12 relative z-10 pb-12">
                <div className="flex flex-wrap gap-2 sm:gap-4 mb-8 bg-white p-2 rounded-2xl shadow-sm w-fit border border-slate-100">
                    <button className={`px-5 sm:px-6 py-2 rounded-xl border-none font-semibold text-sm transition-all duration-300 ${activeTab === 'analytics' ? 'bg-teal-500 text-white shadow-md shadow-teal-500/30' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => setActiveTab('analytics')}>Analytics</button>
                    <button className={`px-5 sm:px-6 py-2 rounded-xl border-none font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${activeTab === 'approve' ? 'bg-teal-500 text-white shadow-md shadow-teal-500/30' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => setActiveTab('approve')}>
                        Approvals {pending.length > 0 && <span className="bg-rose-500 text-white px-2 py-0.5 rounded-md text-xs font-black shadow-sm">{pending.length}</span>}
                    </button>
                    <button className={`px-5 sm:px-6 py-2 rounded-xl border-none font-semibold text-sm transition-all duration-300 ${activeTab === 'log' ? 'bg-teal-500 text-white shadow-md shadow-teal-500/30' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => setActiveTab('log')}>My Pass</button>
                </div>

                {/* ANALYTICS TAB */}
                {activeTab === 'analytics' && analytics && (
                    <div className="space-y-6">
                        {/* CONTROL BAR: Filtering */}
                        <div className="flex flex-wrap justify-end gap-3 mb-4">
                            <select className="h-10 px-4 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm font-medium text-slate-700 shadow-sm" value={timeframe} onChange={e => { setTimeframe(e.target.value); setPage(1); }}>
                                <option value="today">Today</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                                <option value="all">All Time</option>
                            </select>
                            <button className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm text-sm" onClick={exportToCSV}>Download Log (CSV)</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                                <h4 className="text-slate-500 text-center mb-4 text-sm font-bold uppercase tracking-widest">Pass Status</h4>
                                <div className="h-56">
                                    {analytics.wardenStatus?.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={analytics.wardenStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={70} paddingAngle={4} dataKey="value">
                                                    {analytics.wardenStatus.map((entry, index) => <Cell key={`cell-${index}`} fill={getStatusChartColor(entry.name, index)} stroke="rgba(0,0,0,0.05)" strokeWidth={1} />)}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} cursor={false} />
                                                <Legend
                                                    verticalAlign="bottom"
                                                    iconType="circle"
                                                    formatter={(value) => <span title={value} className="cursor-help">{value?.length > 18 ? value.substring(0, 18) + '...' : value}</span>}
                                                    wrapperStyle={{ fontSize: '11.5px', color: '#64748b', paddingTop: '15px', lineHeight: '2' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <p className="text-slate-400 text-center mt-20 text-sm font-medium">No data available yet.</p>}
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                                <h4 className="text-slate-500 text-center mb-4 text-sm font-bold uppercase tracking-widest">Top Destinations</h4>
                                <div className="h-56">
                                    {analytics.wardenDestinations?.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={analytics.wardenDestinations} cx="50%" cy="50%" innerRadius={30} outerRadius={70} paddingAngle={2} dataKey="value">
                                                    {analytics.wardenDestinations.map((entry, index) => <Cell key={`cell-${index}`} fill={GENERAL_COLORS[index % GENERAL_COLORS.length]} stroke="rgba(0,0,0,0.05)" strokeWidth={1} />)}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#64748b', paddingTop: '15px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <p className="text-slate-400 text-center mt-20 text-sm font-medium">No data available yet.</p>}
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 flex flex-col justify-center items-center">
                                <h4 className="text-slate-500 text-center mb-4 text-sm font-bold uppercase tracking-widest">Currently Outside</h4>
                                <h2 className="text-6xl font-black text-teal-500 m-0 drop-shadow-sm">{analytics.currentlyOutside || 0}</h2>
                                <p className="text-slate-500 text-sm mt-3 font-bold uppercase tracking-widest">Active Passes</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* APPROVALS TAB */}
                {activeTab === 'approve' && (
                    <div className="space-y-6">
                        <div className="flex justify-center mb-6">
                            <div className="bg-slate-100 p-1.5 rounded-full flex gap-1 shadow-inner border border-slate-200">
                                <button className={`px-6 py-2 rounded-full font-bold text-sm transition-all duration-300 ${approvalSubTab === 'pending' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setApprovalSubTab('pending')}>Pending Requests</button>
                                <button className={`px-6 py-2 rounded-full font-bold text-sm transition-all duration-300 ${approvalSubTab === 'history' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setApprovalSubTab('history')}>Approvals History</button>
                            </div>
                        </div>

                        {approvalSubTab === 'pending' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-slate-800 m-0">Pending Requests</h3>
                                    {pending.length > 0 && <button className="h-10 px-5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition-colors shadow-sm text-sm" onClick={handleApproveAll}>Approve All ({pending.length})</button>}
                                </div>
                                {pending.length === 0 && <p className="text-slate-500 italic bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">No pending requests.</p>}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {pending.map(req => (
                                        <div key={req._id} className="bg-white p-5 rounded-2xl shadow-md border border-slate-100 border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="m-0 text-slate-800 font-bold text-lg">{req.userId.name}</h4>
                                                <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500 font-bold tracking-wider">{req.userId.hostel ? 'HOSTELER' : 'DAY SCHOLAR'}</span>
                                            </div>
                                            <p className="text-slate-600 text-sm my-3 font-medium">{req.reason} <span className="text-slate-300 mx-1">➔</span> <span className="text-teal-600 font-bold">{req.destination}</span></p>

                                            {rejectId === req._id ? (
                                                <div className="mt-4 pt-4 border-t border-slate-100">
                                                    <input className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none text-sm mb-3 bg-slate-50" placeholder="Reason for rejection..." onChange={e => setRejectReason(e.target.value)} />
                                                    <div className="flex gap-2">
                                                        <button className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-sm transition-colors" onClick={() => decide(req._id, 'rejected')}>CONFIRM</button>
                                                        <button className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-sm transition-colors" onClick={() => setRejectId(null)}>CANCEL</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                                                    <button className="flex-1 py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg text-sm transition-colors shadow-sm" onClick={() => decide(req._id, 'approved')}>APPROVE</button>
                                                    <button className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold rounded-lg text-sm transition-colors" onClick={() => setRejectId(req._id)}>REJECT</button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {approvalSubTab === 'history' && (
                            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-100">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                                    <h3 className="text-xl font-bold text-slate-800 m-0">Approvals History</h3>
                                    <div className="flex gap-2">
                                        <input className="h-10 px-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none text-sm bg-slate-50 w-36 sm:w-48" placeholder="Search Name..." onChange={e => setHistorySearch(e.target.value)} />
                                        <select className="h-10 px-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none text-sm bg-slate-50" onChange={e => setHistoryFilter(e.target.value)}>
                                            <option value="all">All</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="completed">Completed</option><option value="overdue">Overdue</option><option value="void">Void</option>
                                        </select>
                                    </div>
                                </div>
                                {Object.keys(groupedApproverHistory).map(date => (
                                    <div key={date} className="mb-6">
                                        <div className="text-teal-600 text-xs font-bold mt-5 mb-3 uppercase tracking-wider">{date}</div>
                                        <div className="space-y-3">
                                            {groupedApproverHistory[date].map(req => (
                                                <div key={req._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 hover:shadow-md transition-shadow">
                                                    <div className="mb-3 sm:mb-0">
                                                        <div className="font-bold text-slate-800">{req.userId.name}</div>
                                                        <div className="text-slate-600 text-sm font-medium my-1"><span className="text-teal-600">{req.destination}</span> <span className="text-slate-300 mx-1">•</span> {req.reason}</div>
                                                        <div className="text-xs text-slate-400 font-mono mt-2">
                                                            {req.outTime && <span className="mr-3">OUT: {new Date(req.outTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                                                            {req.actualReturnTime && <span>IN: {new Date(req.actualReturnTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${req.status === 'approved' ? 'bg-teal-100 text-teal-700' :
                                                            req.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                                                                req.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                                    req.status === 'active' ? 'bg-cyan-100 text-cyan-700' :
                                                                        req.status === 'overdue' ? 'bg-amber-100 text-amber-700' :
                                                                            req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                                                'bg-slate-100 text-slate-700'
                                                            }`}>{req.status}</span>
                                                        {req.status === 'active' && <button onClick={() => handleAdminOverride(req._id, 'force_complete')} className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-rose-200 mt-1">Force Complete</button>}
                                                        {req.status === 'approved' && <button onClick={() => handleAdminOverride(req._id, 'force_void')} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-slate-300 mt-1">Force Void</button>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {/* PAGINATION CONTROLS */}
                                <div className="flex justify-center items-center gap-4 mt-8 pt-6 border-t border-slate-100">
                                    <button className="h-10 px-5 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Previous</button>
                                    <span className="text-slate-500 font-medium text-sm bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">Page <span className="text-slate-800 font-bold">{page}</span> of <span className="text-slate-800 font-bold">{totalPages}</span></span>
                                    <button className="h-10 px-5 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* LOG TAB */}
                {activeTab === 'log' && (
                    <div className="space-y-6">
                        <div className="flex justify-center mb-6">
                            <div className="bg-slate-100 p-1.5 rounded-full flex gap-1 shadow-inner border border-slate-200">
                                <button className={`px-6 py-2 rounded-full font-bold text-sm transition-all duration-300 ${movementSubTab === 'new' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setMovementSubTab('new')}>New Request</button>
                                <button className={`px-6 py-2 rounded-full font-bold text-sm transition-all duration-300 ${movementSubTab === 'history' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setMovementSubTab('history')}>My History</button>
                            </div>
                        </div>

                        {movementSubTab === 'new' && (
                            <>
                                {!activePass ? (
                                    <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 max-w-2xl mx-auto">
                                        <h3 className="text-xl font-bold text-slate-800 mb-6">New Request</h3>
                                        <div className="space-y-5">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-2">Purpose</label>
                                                <select className="w-full h-12 px-4 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-500 outline-none" onChange={e => setForm({ ...form, reason: e.target.value })}>
                                                    <option>Official Duty</option><option>Personal</option><option>Other</option>
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
                                            <button className="w-full h-12 mt-2 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-500/30 transition-all" onClick={submit}>GENERATE PASS</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 text-center relative overflow-hidden max-w-md mx-auto">
                                        <div className={`absolute top-0 left-0 right-0 h-2 ${activePass.status === 'approved' ? 'bg-teal-500' : activePass.status === 'active' ? 'bg-cyan-500' : 'bg-amber-500'}`}></div>
                                        {!showQr ? (
                                            <div className="py-6">
                                                <h2 className={`text-2xl font-black mb-6 tracking-widest ${activePass.status === 'approved' ? 'text-teal-600' : activePass.status === 'active' ? 'text-cyan-600' : 'text-amber-500'}`}>{activePass.status.toUpperCase()}</h2>
                                                <button className="w-full h-12 rounded-xl bg-slate-800 text-white font-bold tracking-wide hover:bg-slate-900 transition-all" onClick={() => setShowQr(true)}>VIEW PASS QR</button>
                                            </div>
                                        ) : (
                                            <>
                                                <h2 className={`text-2xl font-black mt-2 mb-6 tracking-widest ${activePass.status === 'approved' ? 'text-teal-600' : activePass.status === 'active' ? 'text-cyan-600' : 'text-amber-500'}`}>{activePass.status.toUpperCase()}</h2>
                                                {(activePass.status === 'approved' || activePass.status === 'active') && <div className="bg-white p-4 rounded-2xl inline-block shadow-sm border border-slate-100 mb-6 mx-auto"><DynamicQR passId={activePass._id} userToken={localStorage.getItem('token')} /></div>}
                                                {activePass.status === 'pending' && <p className="text-amber-500 font-bold mb-6">Waiting for Approval...</p>}

                                                {activePass.transportMode === 'provider' && (
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

                                                {activePass.status === 'approved' && activePass.transportMode !== 'provider' && (
                                                    <div className="mt-6 text-left border-t border-slate-100 pt-6">
                                                        <span className="text-sm font-bold text-teal-600 uppercase tracking-widest block mb-4">Available Lifts</span>
                                                        {transportData.providers.length === 0 && <p className="text-slate-500 text-sm">No lifts found.</p>}
                                                        <div className="space-y-3">
                                                            {transportData.providers.filter(p => p.userId && String(p.userId._id) !== String(user._id) && (p.seatsAvailable > 0 || activePass.bookedRideId === p._id)).map(p => {
                                                                const isMyRide = activePass.bookedRideId === p._id;

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
                                                                                {!activePass.bookedRideId && p.seatsAvailable > 0 && (
                                                                                    <button onClick={() => {
                                                                                        const token = localStorage.getItem('token');
                                                                                        axios.put(`http://localhost:5000/api/transport/book/${p._id}`,
                                                                                            { seekerPassId: activePass._id },
                                                                                            { headers: { Authorization: `Bearer ${token}` } }
                                                                                        ).then(() => {
                                                                                            toast.success("Seat Booked Successfully!");
                                                                                            fetchTransportMatches(activePass.destination, activePass.destCoords);
                                                                                            setActivePass(prev => ({ ...prev, bookedRideId: p._id }));
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
                                                        {activePass.transportMode === 'seeker' && (
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
                            </>
                        )}

                        {/* MY HISTORY SECTION */}
                        {movementSubTab === 'history' && (
                            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-100">
                                <h3 className="text-xl font-bold text-slate-800 mb-6">My Pass History</h3>
                                <div className="space-y-4">
                                    {myHistory.length === 0 && <p className="text-slate-500">No history found.</p>}
                                    {myHistory.map(p => (
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
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
export default WardenDash;