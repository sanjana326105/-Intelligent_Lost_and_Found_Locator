import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/auth.css';

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', role: 'student'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword)
      return setError('Passwords do not match.');
    if (form.password.length < 6)
      return setError('Password must be at least 6 characters.');

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      });
      setSuccess(res.data.message);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* LEFT PANEL */}
      <div className="auth-left">
        <div className="brand-logo">Campus<span>Connect</span></div>
        <h1>Find what's lost. Return what's found.</h1>
        <p>A smart campus portal that connects students to recover lost items through intelligent matching.</p>
        <div className="feature-pills">
          <div className="pill">
            <div className="pill-icon">🔍</div>
            Smart item matching algorithm
          </div>
          <div className="pill">
            <div className="pill-icon">💬</div>
            Secure in-app messaging
          </div>
          <div className="pill">
            <div className="pill-icon">🏫</div>
            Campus-verified members only
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="auth-right">
        <div className="auth-card">
          <h2>Create account</h2>
          <p className="subtitle">Join your campus lost & found community</p>

          {error && (
            <div className="alert alert-error">
              <span>⚠️</span> {error}
            </div>
          )}
          {success && (
            <div className="alert alert-success">
              <span>✅</span> {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text" name="name" placeholder="e.g. Arjun Sharma"
                value={form.name} onChange={handleChange} required
              />
            </div>

            <div className="form-group">
              <label>Campus Email</label>
              <input
                type="email" name="email" placeholder="you@university.edu"
                value={form.email} onChange={handleChange} required
              />
            </div>

            <div className="form-group">
              <label>I am a...</label>
              <div className="role-selector">
                <div
                  className={`role-option ${form.role === 'student' ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, role: 'student' })}
                >
                  <div className="role-icon">🎓</div>
                  <div className="role-name">Student</div>
                  <div className="role-desc">Post & find items</div>
                </div>
                <div
                  className={`role-option ${form.role === 'admin' ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, role: 'admin' })}
                >
                  <div className="role-icon">🛡️</div>
                  <div className="role-name">Admin</div>
                  <div className="role-desc">Moderate platform</div>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password" name="password" placeholder="Minimum 6 characters"
                value={form.password} onChange={handleChange} required
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password" name="confirmPassword" placeholder="Repeat your password"
                value={form.confirmPassword} onChange={handleChange} required
              />
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Creating your account...' : 'Create Account →'}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}