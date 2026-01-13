// src/mockData.js

export const USERS = {
    'student': { pass: '123', role: 'student', name: 'Arjun K', dept: 'CS - S5', isHosteler: true },
    'faculty': { pass: '123', role: 'faculty', name: 'Prof. John', dept: 'CS Dept' },
    'guard':   { pass: '123', role: 'guard',   name: 'Main Gate' },
    'warden':  { pass: '123', role: 'warden',  name: 'Hostel Warden' },
    'advisor': { pass: '123', role: 'advisor', name: 'Class Advisor' },
    'office':  { pass: '123', role: 'office',  name: 'Admin Office' }
};

export const MOCK_HISTORY = [
    { id: 1, date: 'Dec 20, 2025', type: 'Home', status: 'Closed' },
    { id: 2, date: 'Dec 22, 2025', type: 'Lunch', status: 'Closed' },
    { id: 3, date: 'Dec 24, 2025', type: 'Medical', status: 'Closed' }
];

export const GLOBAL_LOGS = [
    { id: 101, name: "Student A", type: "Medical", time: "10:00 AM", status: "Pending", willReturn: true, returnTime: "2:00 PM" },
    { id: 102, name: "Student B", type: "Home", time: "4:00 PM", status: "Pending", willReturn: false }
];

export const GLOBAL_REQUESTS = GLOBAL_LOGS; 

export const addLog = (log) => {
    console.log("Log Added", log);
    MOCK_HISTORY.unshift(log); // Adds new log to the TOP of the list
};

// --- TRANSPORT DATA ---
export const STUDENT_SEEKERS = [
    { id: 1, name: "Alvin (S3 CS)", route: "Angamaly Railway Station", phone: "9846xxxxxx", waitTime: "5 mins" },
    { id: 2, name: "Sneha (S5 EC)", route: "Angamaly Town", phone: "9995xxxxxx", waitTime: "2 mins" },
    { id: 3, name: "Rahul (S7 ME)", route: "Mookannoor Bus Stop", phone: "9888xxxxxx", waitTime: "10 mins" }
];

export const AUTO_DRIVERS = [
    { id: 1, name: "Raju (Stand 1)", phone: "9800000001", status: "Available" },
    { id: 2, name: "Mani (Gate 2)", phone: "9800000002", status: "Busy" },
    { id: 3, name: "Suresh (Town)", phone: "9800000003", status: "Available" }
];