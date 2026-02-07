import { useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('currentUser')) || {};

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/');
  };

  return (
    <div style={{display:'flex', justifyContent:'space-between', padding:'15px 20px', background:'#000', borderBottom:'1px solid #333'}}>
      <h2 style={{margin:0, color:'#e50914'}}>FLUX</h2>
      <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
        <span>{user.name}</span>
        <button onClick={handleLogout} style={{background:'none', border:'1px solid #e50914', color:'#e50914', padding:'5px 10px', borderRadius:'4px', cursor:'pointer'}}>LOGOUT</button>
      </div>
    </div>
  );
}
export default Navbar;