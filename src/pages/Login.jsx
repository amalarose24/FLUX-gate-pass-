import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import OneSignal from 'react-onesignal'; // 🚀 ADDED ONESIGNAL

function Login() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        const userStr = localStorage.getItem('currentUser');
        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                const role = user.role;
                if (role === 'student') navigate('/student');
                else if (role === 'faculty') navigate('/faculty');
                else if (role === 'non-teaching') navigate('/non-teaching');
                else if (role === 'warden') navigate('/warden');
                else if (role === 'guard') navigate('/guard');
                else if (role === 'office') navigate('/office');
            } catch (e) {
                localStorage.clear();
            }
        }
    }, [navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMsg(''); // Clear old errors when they try again
        try {
            const res = await axios.post('http://localhost:5000/api/login', { username, password });

            // Store user object and token using localStorage so it syncs across tabs
            localStorage.setItem('currentUser', JSON.stringify(res.data.user));
            localStorage.setItem('authToken', res.data.token);
            localStorage.setItem('token', res.data.token);

            // 🚀 THE MAGIC LINK: Tie this phone to the user's database ID
            try {
                if (window.__oneSignalInitialized) {
                    await OneSignal.login(res.data.user._id.toString());
                    OneSignal.Slidedown.promptPush();
                }
            } catch (error) {
                console.error("OneSignal login error:", error);
            }

            const role = res.data.user.role;
            if (role === 'student') navigate('/student');
            else if (role === 'faculty') navigate('/faculty');
            else if (role === 'non-teaching') navigate('/non-teaching');
            else if (role === 'warden') navigate('/warden');
            else if (role === 'guard') navigate('/guard');
            else if (role === 'office') navigate('/office');
        } catch (err) {
            toast.error("Invalid Username or Password");
            setErrorMsg("Invalid credentials. Please try again.");
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 font-sans p-6">

            {/* Logo and Branding Container */}
            <div className="text-center mb-8">
                <img
                    src="/flux-logo.jpeg"
                    alt="Get2Go Logo"
                    className="w-28 h-28 md:w-36 md:h-36 mx-auto mb-6 object-contain drop-shadow-2xl"
                />
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md mb-2">Flux</h1>
                <p className="text-lg font-medium text-slate-300 tracking-wide">Seamless Access. Smart Mobility.</p>
            </div>

            {/* Floating Card Container */}
            <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md">
                <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center tracking-tight">Welcome Back</h2>

                {errorMsg && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 text-sm rounded-lg text-center font-semibold">
                        {errorMsg}
                    </div>
                )}

                <form className="space-y-5" onSubmit={handleLogin}>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Username</label>
                        <input
                            type="text"
                            className="w-full h-14 px-5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-slate-800 font-medium text-lg"
                            placeholder="Enter username"
                            onChange={e => setUsername(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Password</label>
                        <input
                            type="password"
                            className="w-full h-14 px-5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-slate-800 font-medium text-lg"
                            placeholder="Enter password"
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full h-14 bg-teal-500 hover:bg-teal-600 text-white font-bold text-lg rounded-xl transition-all shadow-lg hover:shadow-teal-500/25 mt-4 flex items-center justify-center"
                    >
                        SIGN IN
                    </button>
                </form>
            </div>
        </div>
    );
}
export default Login;