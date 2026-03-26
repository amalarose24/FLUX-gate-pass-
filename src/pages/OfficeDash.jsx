import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const socket = io('http://localhost:5000');

// 🎨 MINIMALIST DARK MODE PALETTE
const GENERAL_COLORS = ['#6366f1', '#10b981', '#64748b', '#8b5cf6', '#0ea5e9'];
const CHART_TEXT = '#94a3b8';

const STATUS_COLORS = { APPROVED: '#10b981', REJECTED: '#f43f5e', COMPLETED: '#3b82f6', OVERDUE: '#f59e0b', ACTIVE: '#06b6d4', PENDING: '#eab308', VOID: '#64748b' };

const getStatusChartColor = (statusName, index) => {
    return STATUS_COLORS[statusName?.toUpperCase()] || GENERAL_COLORS[index % GENERAL_COLORS.length];
};

function OfficeDash() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const [activeTab, setActiveTab] = useState('analytics');
    const [pending, setPending] = useState([]);
    const [history, setHistory] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [historySearch, setHistorySearch] = useState("");
    const [historyFilter, setHistoryFilter] = useState("all");

    // NEW STATES: Pagination & Filtering
    const [timeframe, setTimeframe] = useState('week');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // NEW: State for rejection reason
    const [rejectId, setRejectId] = useState(null);
    const [rejectReason, setRejectReason] = useState("");

    const [approvalSubTab, setApprovalSubTab] = useState('pending');

    const sendSystemNotification = (title, body) => { if (Notification.permission === 'granted') new Notification(title, { body, icon: '/vite.svg' }); };

    useEffect(() => {
        if (Notification.permission !== 'granted') Notification.requestPermission();

        // Removed the accidental spaces in the socket listener!
        socket.on(`notify-${user._id}`, (data) => {
            sendSystemNotification(data.title, data.msg);
            toast(data.title + ": " + data.msg, { icon: '🔔', duration: 5000 });
            refreshData();
        });

        refreshData();
        // Removed the accidental spaces in the cleanup function!
        return () => socket.off(`notify-${user._id}`);
    }, []);

    useEffect(() => {
        refreshData();
    }, [timeframe, page]);

    const refreshData = () => {
        const token = localStorage.getItem('token');
        axios.get(`http://localhost:5000/api/pass/approver-data/${user._id}?page=${page}&limit=50`, { headers: { Authorization: `Bearer ${token}` } }).then(res => {
            setPending(res.data.pending);
            setHistory(res.data.history);
            setTotalPages(Math.ceil(res.data.totalHistoryCount / 50) || 1);
        });
        axios.get(`http://localhost:5000/api/analytics?role=${user.role}&batch=${user.advisorBatch || user.batch || ''}&timeframe=${timeframe}`).then(res => {
            setAnalytics(res.data);
        }).catch(err => console.log("Analytics error", err));
    };

    const exportToCSV = () => {
        if (!history || history.length === 0) return toast.error("No history to export");

        const headers = ["Date", "Time", "Name", "Role", "Destination", "Reason", "Status"];

        const rows = history.map(req => {
            const dateObj = new Date(req.createdAt || req.updatedAt);
            const dateStr = `="${dateObj.toLocaleDateString()}"`;
            const timeStr = `="${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}"`;

            // Wrap in double quotes and escape existing quotes (csv standard)
            const safeDestination = `"${(req.destination || '').replace(/"/g, '""')}"`;
            const safeReason = `"${(req.reason || '').replace(/"/g, '""')}"`;

            return [
                dateStr,
                timeStr,
                req.userId?.name || 'Unknown',
                req.userRole,
                safeDestination,
                safeReason,
                req.status
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "Get2Go_Master_Log.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
                setRejectId(null); // Assuming setRejectId is the correct state setter for rejectId
                refreshData(); // Assuming refreshData is the correct function to refresh approvals
            })
            .catch(err => toast.error(err.response?.data?.msg || "Failed to decide on pass"));
    };

    const handleAdminOverride = (passId, action) => {
        const token = localStorage.getItem('token');
        axios.put(`http://localhost:5000/api/pass/admin-override/${passId}`, { action }, { headers: { Authorization: `Bearer ${token}` } })
            .then(() => { toast.success(action === 'force_complete' ? 'Pass Force Completed' : 'Pass Voided'); refreshData(); })
            .catch(err => toast.error(err.response?.data?.msg || 'Override failed'));
    };

    const handleApproveAll = () => {
        if (pending.length === 0) return toast.error("No pending requests");
        const ids = pending.map(p => p._id);
        const token = localStorage.getItem('token');
        axios.put('http://localhost:5000/api/pass/bulk-approve', { passIds: ids }, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => { toast.success(`${res.data.modifiedCount} passes approved!`); refreshData(); })
            .catch(err => toast.error(err.response?.data?.msg || "Bulk approve failed"));
    };

    const groupedHistory = history.filter(req => (historyFilter === 'all' || req.status === historyFilter) && req.userId.name.toLowerCase().includes(historySearch.toLowerCase())).reduce((groups, req) => { const date = new Date(req.createdAt).toLocaleDateString(); if (!groups[date]) groups[date] = []; groups[date].push(req); return groups; }, {});

    // Refined Tooltip
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

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            <Navbar />

            {/* Hero Header */}
            <div className="bg-gradient-to-r from-teal-500 to-teal-700 pt-28 pb-20 px-6">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                            Welcome back, {user?.name?.split(' ')[0] || 'Admin'}
                        </h1>
                        <p className="text-teal-100 mt-2 text-lg font-medium">Gatepass Administration & Analytics</p>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 -mt-12 relative z-10 pb-12">
                <div className="flex flex-wrap gap-2 sm:gap-4 mb-8 bg-white p-2 rounded-2xl shadow-sm w-fit border border-slate-100">
                    <button className={`px-5 sm:px-6 py-2 rounded-xl border-none font-semibold text-sm transition-all duration-300 ${activeTab === 'analytics' ? 'bg-teal-500 text-white shadow-md shadow-teal-500/30' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => setActiveTab('analytics')}>Analytics</button>
                    <button className={`px-5 sm:px-6 py-2 rounded-xl border-none font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${activeTab === 'approvals' ? 'bg-teal-500 text-white shadow-md shadow-teal-500/30' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => setActiveTab('approvals')}>
                        Approvals & Logs {pending.length > 0 && <span className="bg-rose-500 text-white px-2 py-0.5 rounded-md text-xs font-black shadow-sm">{pending.length}</span>}
                    </button>
                </div>

                {/* CONTROL BAR: Filtering and Export */}
                <div className="flex flex-wrap justify-end gap-3 mb-6">
                    <select className="h-10 px-4 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm font-medium text-slate-700 shadow-sm" value={timeframe} onChange={e => { setTimeframe(e.target.value); setPage(1); }}>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="all">All Time</option>
                    </select>
                    <button className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm text-sm" onClick={exportToCSV}>Download Master Log (CSV)</button>
                </div>

                {/* 📊 ELEGANT ANALYTICS DASHBOARD */}
                {activeTab === 'analytics' && analytics && (
                    <div className="space-y-6">

                        {/* ROW 1: Donut & Pie Charts */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                                <h4 className="text-slate-500 text-center mb-4 text-sm font-bold uppercase tracking-widest">System Status</h4>
                                <div className="h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={analytics.statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={70} paddingAngle={4} dataKey="value">
                                                {analytics.statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={getStatusChartColor(entry.name, index)} stroke="rgba(0,0,0,0.05)" strokeWidth={1} />)}
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
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                                <h4 className="text-slate-500 text-center mb-4 text-sm font-bold uppercase tracking-widest">Top Destinations</h4>
                                <div className="h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={analytics.destinationsData} cx="50%" cy="50%" innerRadius={30} outerRadius={70} paddingAngle={2} dataKey="value">
                                                {analytics.destinationsData.map((entry, index) => <Cell key={`cell-${index}`} fill={GENERAL_COLORS[index % GENERAL_COLORS.length]} stroke="rgba(0,0,0,0.05)" strokeWidth={1} />)}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#64748b', paddingTop: '15px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                                <h4 className="text-slate-500 text-center mb-4 text-sm font-bold uppercase tracking-widest">Pass Purposes</h4>
                                <div className="h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={analytics.reasonsData} cx="50%" cy="50%" innerRadius={55} outerRadius={70} paddingAngle={4} dataKey="value">
                                                {analytics.reasonsData.map((entry, index) => <Cell key={`cell-${index}`} fill={GENERAL_COLORS[(index + 2) % GENERAL_COLORS.length]} stroke="rgba(0,0,0,0.05)" strokeWidth={1} />)}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#64748b', paddingTop: '15px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* ROW 2: Transport Analytics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                                <h4 className="text-emerald-600 mb-6 text-sm font-bold uppercase tracking-widest flex items-center gap-2">🚗 Top Ride Providers (Offered)</h4>
                                <div className="h-56">
                                    {analytics.topProvidersData?.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analytics.topProvidersData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                                                <XAxis type="number" hide />
                                                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={100} />
                                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#64748b', paddingTop: '15px' }} />
                                                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={14} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <p className="text-slate-400 text-center mt-20 text-sm font-medium">No data available yet.</p>}
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                                <h4 className="text-blue-500 mb-6 text-sm font-bold uppercase tracking-widest flex items-center gap-2">🙋‍♂️ Top Ride Seekers (Requested)</h4>
                                <div className="h-56">
                                    {analytics.topSeekersData?.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analytics.topSeekersData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                                                <XAxis type="number" hide />
                                                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={100} />
                                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#64748b', paddingTop: '15px' }} />
                                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={14} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <p className="text-slate-400 text-center mt-20 text-sm font-medium">No data available yet.</p>}
                                </div>
                            </div>
                        </div>

                        {/* ROW 3: Approvers & Batch Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                                <h4 className="text-slate-500 mb-6 text-sm font-bold uppercase tracking-widest">Requests by Batch</h4>
                                <div className="h-56">
                                    {analytics.batchData?.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analytics.batchData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#64748b', paddingTop: '15px' }} />
                                                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={25} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <p className="text-slate-400 text-center mt-20 text-sm font-medium">No data available yet.</p>}
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                                <h4 className="text-slate-500 mb-6 text-sm font-bold uppercase tracking-widest">Top Approving Faculty</h4>
                                <div className="h-56">
                                    {analytics.facultyApproversData?.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analytics.facultyApproversData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                                                <XAxis type="number" hide />
                                                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={90} />
                                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#64748b', paddingTop: '15px' }} />
                                                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={15} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <p className="text-slate-400 text-center mt-20 text-sm font-medium">No data available yet.</p>}
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                                <h4 className="text-slate-500 mb-6 text-sm font-bold uppercase tracking-widest">Top Approving Wardens</h4>
                                <div className="h-56">
                                    {analytics.wardenApproversData?.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analytics.wardenApproversData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                                                <XAxis type="number" hide />
                                                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={90} />
                                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#64748b', paddingTop: '15px' }} />
                                                <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={15} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <p className="text-slate-400 text-center mt-20 text-sm font-medium">No data available yet.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: APPROVALS & LOGS */}
                {activeTab === 'approvals' && (
                    <div className="space-y-6">
                        <div className="flex justify-center mb-6">
                            <div className="bg-slate-100 p-1.5 rounded-full flex gap-1 shadow-inner border border-slate-200">
                                <button className={`px-6 py-2 rounded-full font-bold text-sm transition-all duration-300 ${approvalSubTab === 'pending' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setApprovalSubTab('pending')}>Pending Requests</button>
                                <button className={`px-6 py-2 rounded-full font-bold text-sm transition-all duration-300 ${approvalSubTab === 'history' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setApprovalSubTab('history')}>Approvals History</button>
                            </div>
                        </div>

                        {approvalSubTab === 'pending' && (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-slate-500 font-bold uppercase tracking-widest text-sm">Pending Approvals</h4>
                                    {pending.length > 0 && <button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-sm text-sm" onClick={handleApproveAll}>Approve All ({pending.length})</button>}
                                </div>
                                {pending.length === 0 && <p className="text-slate-400 italic bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">No pending requests.</p>}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {pending.map(req => (
                                        <div key={req._id} className="bg-white p-5 rounded-2xl shadow border-l-4 border-teal-500 flex flex-col justify-between hover:shadow-lg transition-shadow">
                                            <div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="m-0 text-slate-800 font-bold text-lg">{req.userId.name}</h4>
                                                    <span className="text-xs bg-slate-100 px-2 py-1 rounded-md text-slate-500 font-semibold">{req.userRole.toUpperCase()}</span>
                                                </div>
                                                <p className="text-slate-600 text-sm mb-4 leading-relaxed">{req.reason} <span className="mx-1 text-slate-400">➔</span> <span className="font-semibold text-slate-800">{req.destination}</span></p>
                                            </div>

                                            {/* NEW: Rejection Input Logic */}
                                            {rejectId === req._id ? (
                                                <div className="mt-2">
                                                    <input className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none text-sm mb-2" placeholder="Reason for rejection..." onChange={e => setRejectReason(e.target.value)} />
                                                    <div className="flex gap-2">
                                                        <button className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold h-10 rounded-lg transition-colors text-sm" onClick={() => decide(req._id, 'rejected')}>Confirm</button>
                                                        <button className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold h-10 rounded-lg transition-colors text-sm" onClick={() => setRejectId(null)}>Cancel</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2 mt-2">
                                                    <button className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-bold h-10 rounded-lg transition-colors shadow-sm text-sm" onClick={() => decide(req._id, 'approved')}>Approve</button>
                                                    <button className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold h-10 rounded-lg transition-colors shadow-sm text-sm" onClick={() => setRejectId(req._id)}>Reject</button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {approvalSubTab === 'history' && (
                            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-100">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                    <h4 className="m-0 text-slate-500 font-bold uppercase tracking-widest text-sm">Approvals History</h4>
                                    <div className="flex gap-3 w-full sm:w-auto">
                                        <input className="flex-1 sm:w-48 h-10 px-4 rounded-lg border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none text-sm bg-slate-50" placeholder="Search name..." onChange={e => setHistorySearch(e.target.value)} />
                                        <select className="h-10 px-4 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm text-slate-700 bg-slate-50" onChange={e => setHistoryFilter(e.target.value)}>
                                            <option value="all">All</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="completed">Completed</option><option value="overdue">Overdue</option><option value="void">Void</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {Object.keys(groupedHistory).map(date => (
                                        <div key={date}>
                                            <div className="text-teal-600 text-xs font-bold uppercase tracking-wider mb-3 pl-1">{date}</div>
                                            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
                                                {groupedHistory[date].map(req => (
                                                    <div key={req._id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between group gap-4">
                                                        <div className="flex-1">
                                                            <div className="font-bold text-slate-800 flex items-center gap-2">
                                                                {req.userId.name}
                                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">{req.userRole}</span>
                                                            </div>
                                                            <div className="text-sm text-slate-600 font-medium mt-1"><span className="text-teal-600">{req.destination}</span> <span className="text-slate-300 mx-1">•</span> {req.reason}</div>
                                                            {req.status === 'rejected' && <div className="text-xs text-rose-500 mt-2 font-bold bg-rose-50 inline-block px-2 py-1 rounded">Reason: {req.rejectionReason}</div>}
                                                            <div className="text-xs text-slate-400 mt-2 font-mono">
                                                                {req.outTime && <span className="mr-3">Out: {new Date(req.outTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                                                                {req.actualReturnTime && <span>In: {new Date(req.actualReturnTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                                                            </div>
                                                        </div>
                                                        <div className="text-right flex flex-col items-end gap-2">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                                                                ${req.status === 'approved' || req.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                                    req.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                                                                        req.status === 'overdue' ? 'bg-amber-100 text-amber-700' :
                                                                            req.status === 'void' ? 'bg-slate-100 text-slate-600' :
                                                                                'bg-blue-100 text-blue-700'}`}
                                                            >
                                                                {req.status}
                                                            </span>

                                                            <div className="flex gap-2 transition-opacity">
                                                                {req.status === 'active' && <button onClick={() => handleAdminOverride(req._id, 'force_complete')} className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">Force Complete</button>}
                                                                {req.status === 'approved' && <button onClick={() => handleAdminOverride(req._id, 'force_void')} className="bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">Force Void</button>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* PAGINATION CONTROLS */}
                                <div className="flex justify-center items-center gap-4 mt-8 pt-6 border-t border-slate-100">
                                    <button className={`h-10 px-5 rounded-lg font-bold text-sm transition-colors ${page <= 1 ? 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-200' : 'bg-white text-slate-700 shadow-sm hover:bg-slate-50 border border-slate-300'}`} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Previous</button>
                                    <span className="text-slate-500 font-medium text-sm bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">Page <span className="text-slate-800 font-bold">{page}</span> of <span className="text-slate-800 font-bold">{totalPages}</span></span>
                                    <button className={`h-10 px-5 rounded-lg font-bold text-sm transition-colors ${page >= totalPages ? 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-200' : 'bg-white text-slate-700 shadow-sm hover:bg-slate-50 border border-slate-300'}`} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
export default OfficeDash;