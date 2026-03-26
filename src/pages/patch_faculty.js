const fs = require('fs');

const file = 'c:/miniproject/college-gatepass/src/pages/FacultyDash.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace 1: Wrap Structure & Tabs
content = content.replace(
    /        <div className="fd-page">[\s\S]*?<\/div>/,
    `        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200">\n            <Navbar />\n            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">\n\n                <div className="flex flex-wrap gap-2 mb-8 bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm w-fit">\n                    {isAdvisor && <button className={\`px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 \${activeTab === 'analytics' ? 'bg-teal-500 text-white shadow-md shadow-teal-500/30' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}\`} onClick={() => setActiveTab('analytics')}>Analytics</button>}\n                    {isAdvisor && <button className={\`px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 \${activeTab === 'approve' ? 'bg-teal-500 text-white shadow-md shadow-teal-500/30' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}\`} onClick={() => setActiveTab('approve')}>Approvals</button>}\n                    <button className={\`px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 \${activeTab === 'log' ? 'bg-teal-500 text-white shadow-md shadow-teal-500/30' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}\`} onClick={() => setActiveTab('log')}>My Movement</button>\n                </div>`
);

fs.writeFileSync(file, content);
console.log('Patched part 1');
