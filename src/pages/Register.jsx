import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '', username: '', password: '', role: 'student', batch: '', advisorBatch: '', parentPhone: '', hasVehicle: false, vehicleType: 'Car', seats: 4
  });

  const handleChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({...formData, [e.target.name]: val});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/register', {
        ...formData,
        vehicle: { hasVehicle: formData.hasVehicle, type: formData.vehicleType, seats: Number(formData.seats) }
      });
      alert("Account Created!"); navigate('/');
    } catch(err) { alert("Error: Username taken"); }
  };

  return (
    <div className="splash-container">
      <div className="glass-card" style={{width:'400px'}}>
        <h2>Register</h2>
        <form onSubmit={handleSubmit}>
          <input className="netflix-input" name="name" placeholder="Full Name" onChange={handleChange} required />
          <input className="netflix-input" name="username" placeholder="Username" onChange={handleChange} required />
          <input className="netflix-input" name="password" type="password" placeholder="Password" onChange={handleChange} required />
          
          <label>Role:</label>
          <select className="netflix-input" name="role" onChange={handleChange} value={formData.role}>
            <option value="student">Student</option>
            <option value="faculty">Faculty / Advisor</option>
            <option value="warden">Warden</option>
            <option value="guard">Guard</option>
          </select>

          {formData.role === 'student' && (
            <>
              <input className="netflix-input" name="batch" placeholder="Batch (e.g. S6-CS)" onChange={handleChange} />
              <input className="netflix-input" name="parentPhone" placeholder="Parent Phone" onChange={handleChange} />
            </>
          )}

          {formData.role === 'faculty' && (
            <input className="netflix-input" name="advisorBatch" placeholder="Advisor for Batch? (Optional)" onChange={handleChange} />
          )}

          <div style={{background:'#333', padding:'10px', marginTop:'10px'}}>
             <label><input type="checkbox" name="hasVehicle" onChange={handleChange} /> I have a vehicle</label>
          </div>

          <button className="netflix-btn" style={{marginTop:'20px'}}>Sign Up</button>
        </form>
      </div>
    </div>
  );
}
export default Register;