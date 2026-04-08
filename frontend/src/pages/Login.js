import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/auth.css';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      if (res.data.user.role === 'admin') navigate('/admin/dashboard');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* LEFT PANEL */}
      <div className="auth-left">
        <div className="brand-logo">Campus<span>Connect</span></div>
        <h1>Welcome back to your campus hub.</h1>
        <p>Sign in to check on your lost items, browse found listings, and chat with fellow students.</p>
        <div className="feature-pills">
          <div className="pill">
            <div className="pill-icon">📦</div>
            Track your reported items
          </div>
          <div className="pill">
            <div className="pill-icon">🔔</div>
            Get notified on matches
          </div>
          <div className="pill">
            <div className="pill-icon">✅</div>
            Mark items as recovered
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="auth-right">
        <div className="auth-card">
          <h2>Sign in</h2>
          <p className="subtitle">Use your campus email to continue</p>

          {error && (
            <div className="alert alert-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Campus Email</label>
              <input
                type="email" name="email" placeholder="you@university.edu"
                value={form.email} onChange={handleChange} required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password" name="password" placeholder="Enter your password"
                value={form.password} onChange={handleChange} required
              />
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account? <Link to="/signup">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}