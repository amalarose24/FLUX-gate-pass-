import { useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('currentUser')) || { name: 'User', role: 'Guest' };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/');
  };

  return (
    <div style={navStyle}>
      {/* Left: Logo + Name */}
      <div 
        onClick={() => navigate('/')} 
        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
      >
        <img src="/flux-logo.jpeg" alt="Logo" style={{ width: '35px', height: '35px', borderRadius: '50%', border: '2px solid #00e5ff' }} />
        <h1 style={{ 
            margin: 0, 
            fontSize: '1.5rem', 
            fontWeight: '900', 
            letterSpacing: '2px',
            color: 'white'
        }}>
          FLUX
        </h1>
      </div>

      {/* Right: User Info & Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ textAlign: 'right', display: 'none', sm: 'block' }}> 
          <div style={{ color: '#00e5ff', fontWeight: 'bold', fontSize: '14px' }}>{user.name}</div>
        </div>
        
        <button 
          onClick={handleLogout} 
          style={{ 
            padding: '8px 15px', 
            fontSize: '12px', 
            background: 'transparent', 
            border: '1px solid #00e5ff', 
            color: '#00e5ff',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}>
          LOGOUT
        </button>
      </div>
    </div>
  );
}

// Styling for the Navbar
const navStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '15px 20px',
  background: 'rgba(0,0,0,0.95)', 
  borderBottom: '1px solid #333',
  marginBottom: '20px',
  position: 'sticky',
  top: 0,
  zIndex: 100,
  backdropFilter: 'blur(10px)'
};

export default Navbar;