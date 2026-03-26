import { useNavigate } from 'react-router-dom';
import fluxLogo from '../assets/flux-logo.jpeg';

function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('currentUser'));

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    navigate('/login');
  };

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '70px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', background: 'rgba(10, 10, 10, 0.9)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #222', zIndex: 50, boxSizing: 'border-box'
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img src={fluxLogo} alt="Get2Go" style={{ height: '32px', width: '32px', borderRadius: '50%', border: '1px solid #00bfa5' }} />
        <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'white', letterSpacing: '1px' }}>
          Flux
        </span>
      </div>

      {/* User Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <span style={{ color: '#666', fontSize: '0.85rem', fontWeight: '500' }}>
          {user?.name?.split(' ')[0]}
        </span>
        <button
          onClick={handleLogout}
          style={{
            background: 'transparent', color: '#c62828', border: '1px solid #333',
            padding: '6px 12px', borderRadius: '4px', fontSize: '0.75rem',
            fontWeight: '700', cursor: 'pointer', textTransform: 'uppercase'
          }}
        >
          Exit
        </button>
      </div>
    </nav>
  );
}
export default Navbar;