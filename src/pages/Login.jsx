// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { USERS } from '../mockData';

function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const user = USERS[username];

    // Simple password check
    if (user && user.pass === password) {
      sessionStorage.setItem('currentUser', JSON.stringify(user));
      navigate(`/${user.role}`);
    } else {
      setError('Invalid Credentials. Try: student / 123');
    }
  };

  return (
    <div className="fade-in" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#141414' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '40px', background: 'rgba(30,30,30,0.9)' }}>
        <h2 style={{ color: 'white', marginBottom: '30px', fontWeight: 'bold' }}>Sign In</h2>
        
        <form onSubmit={handleLogin}>
          <input 
            className="netflix-input" 
            placeholder="Username" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
          />
          <input 
            className="netflix-input" 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
          />
          
          <button type="submit" className="netflix-btn">Sign In</button>
          
          {error && <p style={{ color: '#e50914', marginTop: '15px', fontSize: '14px' }}>{error}</p>}
        </form>
      </div>
    </div>
  );
}

export default Login;