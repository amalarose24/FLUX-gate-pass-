import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { Camera, LogOut, LogIn } from 'lucide-react';

function GuardScanner() {
  const [scanResult, setScanResult] = useState(null);
  const [passState, setPassState] = useState(null); // 'exit_ready', 'entry_ready', 'completed'
  const [studentName, setStudentName] = useState("");
  const user = JSON.parse(localStorage.getItem('currentUser'));

  const scannerRef = useRef(null);
  const lastScanRef = useRef(0);

  useEffect(() => {
    // Initialize headless scanner
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    const startScanner = async () => {
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            const now = Date.now();
            // 4000ms debounce
            if (now - lastScanRef.current > 4000) {
              lastScanRef.current = now;

              // Pause to let guard confirm
              html5QrCode.pause();

              setScanResult(decodedText);
              checkStatus(decodedText);
            }
          },
          (errorMessage) => {
            // ignore continuous scanning parse errors
          }
        );
      } catch (err) {
        console.warn("Camera start failed:", err);
      }
    };

    startScanner();

    return () => {
      try {
        if (scannerRef.current && scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => { });
        }
      } catch (e) { }
    };
  }, []);

  const checkStatus = (id) => {
    axios.get(`http://localhost:5000/api/pass/status/${encodeURIComponent(id)}`)
      .then(res => {
        setPassState(res.data.state);
        setStudentName(res.data.student);
      })
      .catch(() => setPassState('invalid'));
  };

  const processScan = (type) => {
    axios.post('http://localhost:5000/api/scan', { passId: scanResult, type })
      .then(res => {
        if (res.data.success) {
          if (res.data.role === 'student') {
            let msg = `✅ Scan Successful!\nStudent: ${res.data.studentName}\nBatch: ${res.data.batch}\nWhatsApp: ${res.data.waSent ? 'Sent' : 'Failed'}`;
            if (res.data.autoScanned && res.data.autoScanned.length > 0) {
              msg += `\n🚗 Passengers Auto-Scanned: ${res.data.autoScanned.join(', ')}`;
            }
            toast.success(msg, { duration: 6000 });
          } else {
            toast.success(`✅ Scan Successful!\nStaff Member: ${res.data.studentName}\nRole: ${res.data.role.toUpperCase()}`, { duration: 5000 });
          }
          setTimeout(() => window.location.reload(), 5000);
        }
      })
      .catch(err => {
        toast.error("Error: " + (err.response?.data?.msg || "Failed"), { duration: 4000 });
        setTimeout(() => window.location.reload(), 4000);
      });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans transition-colors duration-300 flex flex-col items-center">
      <Navbar />
      <div className="w-full max-w-md px-4 py-8 pt-28 text-center">

        <div className="mb-8">
          <h2 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-cyan-400">
            Gate Scanner
          </h2>
          <p className="text-slate-400 mt-2 font-medium">Point camera at pass QR code</p>
        </div>

        {/* The Camera Box */}
        {!scanResult && (
          <div className="relative w-full aspect-square max-w-sm mx-auto overflow-hidden rounded-3xl border-4 border-teal-500/50 shadow-2xl shadow-teal-500/20 bg-slate-800 mb-8 flex items-center justify-center">
            <div id="reader" className="w-full h-full object-cover"></div>
          </div>
        )}

        {/* Results Area */}
        {scanResult && (
          <div className="bg-slate-800 p-6 rounded-3xl shadow-xl border border-slate-700 mx-auto max-w-sm text-left">
            <h3 className="text-sm font-bold text-slate-400 mb-1 tracking-widest uppercase">Pass Detected</h3>
            {studentName && <h4 className="text-2xl font-black text-teal-400 mb-6">{studentName}</h4>}

            {passState === 'exit_ready' && (
              <button
                className="w-full bg-slate-900 hover:bg-slate-950 text-white p-4 text-lg rounded-2xl font-bold flex items-center justify-center gap-3 transition-colors border-2 border-slate-700 shadow-lg mb-4"
                onClick={() => processScan('exit')}
              >
                <LogOut size={24} className="text-rose-400" /> SCAN EXIT
              </button>
            )}

            {passState === 'entry_ready' && (
              <button
                className="w-full bg-slate-900 hover:bg-slate-950 text-white p-4 text-lg rounded-2xl font-bold flex items-center justify-center gap-3 transition-colors border-2 border-slate-700 shadow-lg mb-4"
                onClick={() => processScan('entry')}
              >
                <LogIn size={24} className="text-teal-400" /> SCAN ENTRY
              </button>
            )}

            {passState === 'completed' && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6">
                <h3 className="text-amber-500 font-bold text-center">PASS EXPIRED / COMPLETED</h3>
              </div>
            )}

            {passState === 'invalid' && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mb-6">
                <h3 className="text-rose-500 font-bold text-center">INVALID PASS ID</h3>
              </div>
            )}

            <button
              className="w-full bg-teal-500 hover:bg-teal-600 text-white p-4 text-lg rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-teal-500/20 mt-4"
              onClick={() => window.location.reload()}
            >
              <Camera size={24} /> Scan Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
export default GuardScanner;