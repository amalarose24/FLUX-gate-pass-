import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from 'axios';
import Navbar from '../components/Navbar';

function GuardScanner() {
  const [msg, setMsg] = useState("Ready");
  const [passId, setPassId] = useState(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
    scanner.render((txt) => {
      if(txt.startsWith("PASS:")) {
        setPassId(txt.split(":")[1]);
        setMsg("QR Detected!");
        scanner.pause();
      }
    });
    return () => scanner.clear();
  }, []);

  const handleScan = (type) => {
    axios.post('http://localhost:5000/api/scan', { passId, type }).then(res => {
       alert(`Success: ${res.data.student} marked ${type}`);
       window.location.reload();
    }).catch(err => alert(err.response.data.msg));
  };

  return (
    <div className="fade-in">
      <Navbar />
      <div className="content-pad" style={{textAlign:'center'}}>
        <h2>Gate Scanner</h2>
        <div id="reader" style={{width:'300px', margin:'auto', background:'white'}}></div>
        <h3>{msg}</h3>
        {passId && (
          <div>
            <button className="btn btn-danger" style={{padding:'20px'}} onClick={()=>handleScan('exit')}>CONFIRM EXIT</button>
            <button className="btn btn-success" style={{padding:'20px'}} onClick={()=>handleScan('entry')}>CONFIRM ENTRY</button>
          </div>
        )}
      </div>
    </div>
  );
}
export default GuardScanner;