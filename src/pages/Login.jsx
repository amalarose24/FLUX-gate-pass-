import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/login', { username, password });
      sessionStorage.setItem('currentUser', JSON.stringify(res.data));
      
      const role = res.data.role;
      if(role === 'student') navigate('/student');
      else if(role === 'faculty') navigate('/faculty');
      else if(role === 'warden') navigate('/warden');
      else if(role === 'guard') navigate('/guard');
      else if(role === 'office') navigate('/office');
    } catch(err) { alert("Invalid Credentials"); }
  };

  return (
    <div className="splash-container">
      <div className="glass-card" style={{width:'350px'}}>
        <h1 style={{color:'#e50914'}}>FLUX</h1>
        <p style={{color:'#aaa'}}>Gate Pass System</p>
        <form onSubmit={handleLogin}>
          <input className="netflix-input" placeholder="Username" onChange={e=>setUsername(e.target.value)} />
          <input className="netflix-input" type="password" placeholder="Password" onChange={e=>setPassword(e.target.value)} />
          <button className="netflix-btn" style={{marginTop:'15px'}}>Sign In</button>
        </form>
      </div>
    </div>
  );
}
export default Login;