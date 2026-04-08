import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/dashboard.css';

const API = 'http://localhost:5000/api';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const [activeTab, setActiveTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [flaggedPosts, setFlaggedPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const logout = () => { localStorage.clear(); navigate('/login'); };

  const showAlert = (msg, type = 'success') => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 3000);
  };

  const fetchAllPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/posts/admin/all`, authHeader);
      setPosts(res.data);
    } catch (err) {
      showAlert('Failed to load posts.', 'error');
    } finally { setLoading(false); }
  }, [token]);

  const fetchFlagged = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/posts/admin/flagged`, authHeader);
      setFlaggedPosts(res.data);
    } catch (err) {
      showAlert('Failed to load flagged posts.', 'error');
    } finally { setLoading(false); }
  }, [token]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/users`, authHeader);
      setUsers(res.data);
    } catch (err) {
      showAlert('Failed to load users.', 'error');
    } finally { setLoading(false); }
  }, [token]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/analytics`, authHeader);
      setAnalytics(res.data);
    } catch (err) {
      showAlert('Failed to load analytics.', 'error');
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'posts') fetchAllPosts();
    if (activeTab === 'flagged') fetchFlagged();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'analytics') fetchAnalytics();
  }, [activeTab]);

  const approvePost = async (id) => {
    try {
      await axios.put(`${API}/posts/${id}/approve`, {}, authHeader);
      setPosts(prev => prev.map(p => p._id === id ? { ...p, status: 'approved', flagged: false } : p));
      showAlert('Post approved.');
    } catch (err) { showAlert('Failed.', 'error'); }
  };

  const deletePost = async (id) => {
    try {
      await axios.delete(`${API}/posts/${id}`, authHeader);
      setPosts(prev => prev.filter(p => p._id !== id));
      setFlaggedPosts(prev => prev.filter(p => p._id !== id));
      showAlert('Post deleted.');
    } catch (err) { showAlert('Failed.', 'error'); }
  };

  const unflagPost = async (id) => {
    try {
      await axios.put(`${API}/posts/${id}/unflag`, {}, authHeader);
      setFlaggedPosts(prev => prev.filter(p => p._id !== id));
      showAlert('Post unflagged.');
    } catch (err) { showAlert('Failed.', 'error'); }
  };

  const verifyUser = async (id) => {
    try {
      await axios.put(`${API}/admin/users/${id}/verify`, {}, authHeader);
      setUsers(prev => prev.map(u => u._id === id ? { ...u, verified: true, flagged: false } : u));
      showAlert('User verified.');
    } catch (err) { showAlert('Failed.', 'error'); }
  };

  const blockUser = async (id) => {
    try {
      await axios.put(`${API}/admin/users/${id}/block`, {}, authHeader);
      setUsers(prev => prev.map(u => u._id === id ? { ...u, verified: false, flagged: true } : u));
      showAlert('User blocked.');
    } catch (err) { showAlert('Failed.', 'error'); }
  };

  const deleteUser = async (id) => {
    try {
      await axios.delete(`${API}/admin/users/${id}`, authHeader);
      setUsers(prev => prev.filter(u => u._id !== id));
      showAlert('User deleted.');
    } catch (err) { showAlert('Failed.', 'error'); }
  };

  const filtered = posts.filter(p =>
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.postedByName?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const initials = (name) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'A';

  const StatCard = ({ icon, number, label, color }) => (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div>
        <div className="stat-number">{number ?? '...'}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );

  const BarChart = ({ data, labelKey, valueKey, color }) => {
    const max = Math.max(...data.map(d => d[valueKey]), 1);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 100, fontSize: 12, color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
              {item[labelKey]}
            </div>
            <div style={{ flex: 1, height: 28, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(item[valueKey] / max) * 100}%`,
                background: color || 'var(--primary)',
                borderRadius: 6,
                display: 'flex', alignItems: 'center', paddingLeft: 8,
                transition: 'width 0.6s ease'
              }}>
                <span style={{ fontSize: 12, color: 'white', fontWeight: 700 }}>{item[valueKey]}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="dash-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">Campus<span>Connect</span></div>
        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>
            <span className="nav-icon">📋</span> All Posts
          </button>
          <button className={`nav-item ${activeTab === 'flagged' ? 'active' : ''}`} onClick={() => setActiveTab('flagged')}>
            <span className="nav-icon">🚩</span> Flagged Content
            {flaggedPosts.length > 0 && (
              <span style={{ marginLeft: 'auto', background: '#ef4444', color: 'white', borderRadius: '10px', padding: '1px 7px', fontSize: '11px' }}>
                {flaggedPosts.length}
              </span>
            )}
          </button>
          <button className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <span className="nav-icon">👥</span> Manage Users
          </button>
          <button className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
            <span className="nav-icon">📊</span> Analytics
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar" style={{ background: '#ef4444' }}>{initials(user.name)}</div>
            <div>
              <div className="user-name">{user.name || 'Admin'}</div>
              <div className="user-role" style={{ color: '#fca5a5' }}>Administrator</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

        {/* ALL POSTS */}
        {activeTab === 'posts' && (
          <>
            <div className="page-header">
              <h1>All Posts</h1>
              <p>Review, approve, or delete user-submitted listings</p>
            </div>
            <div className="stats-grid">
              <StatCard icon="📋" number={posts.length} label="Total Posts" color="blue" />
              <StatCard icon="⏳" number={posts.filter(p => p.status === 'pending').length} label="Pending" color="orange" />
              <StatCard icon="🚩" number={flaggedPosts.length} label="Flagged" color="red" />
            </div>
            <div className="card">
              <div className="search-bar" style={{ marginBottom: 16 }}>
                <input className="search-input" placeholder="Search posts or users..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              {loading ? (
                <div className="empty-state"><div className="empty-icon">⏳</div><h3>Loading...</h3></div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Title</th><th>Type</th><th>Category</th>
                        <th>Posted By</th><th>Date</th><th>Status</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(post => (
                        <tr key={post._id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{post.title}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{post.location}</div>
                          </td>
                          <td><span className={`badge ${post.type}`}>{post.type}</span></td>
                          <td>{post.category}</td>
                          <td>{post.postedByName}</td>
                          <td>{new Date(post.date_reported).toLocaleDateString()}</td>
                          <td>
                            <span className={`badge ${post.flagged ? 'flagged' : post.status}`}>
                              {post.flagged ? '🚩 Flagged' : post.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {post.status === 'pending' && !post.flagged && (
                                <button className="btn-sm success" onClick={() => approvePost(post._id)}>✅ Approve</button>
                              )}
                              {post.flagged && (
                                <button className="btn-sm primary" onClick={() => unflagPost(post._id)}>✔ Unflag</button>
                              )}
                              <button className="btn-sm red" onClick={() => deletePost(post._id)}>🗑️ Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filtered.length === 0 && (
                    <div className="empty-state"><div className="empty-icon">📭</div><h3>No posts found</h3></div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* FLAGGED */}
        {activeTab === 'flagged' && (
          <>
            <div className="page-header">
              <h1>Flagged Content</h1>
              <p>Review posts reported as suspicious or inappropriate</p>
            </div>
            {loading ? (
              <div className="empty-state"><div className="empty-icon">⏳</div><h3>Loading...</h3></div>
            ) : flaggedPosts.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-icon">🎉</div>
                  <h3>No flagged content!</h3>
                  <p>All posts are clean</p>
                </div>
              </div>
            ) : (
              <div className="items-grid">
                {flaggedPosts.map(post => (
                  <div className="item-card" key={post._id} style={{ borderLeft: '3px solid #ef4444' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span className={`item-badge ${post.type}`}>
                        {post.type === 'lost' ? '🔴 Lost' : '🟢 Found'}
                      </span>
                      <span className="badge flagged">🚩 Flagged</span>
                    </div>
                    <div className="item-title">{post.title}</div>
                    <div className="item-desc">{post.description}</div>
                    <div className="item-meta">
                      <span>👤 {post.postedByName}</span>
                      <span>📍 {post.location}</span>
                      <span>📅 {new Date(post.date_reported).toLocaleDateString()}</span>
                    </div>
                    <div className="item-actions" style={{ marginTop: 14 }}>
                      <button className="btn-sm primary" onClick={() => unflagPost(post._id)}>✔ Keep & Unflag</button>
                      <button className="btn-sm red" onClick={() => deletePost(post._id)}>🗑️ Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* MANAGE USERS */}
        {activeTab === 'users' && (
          <>
            <div className="page-header">
              <h1>Manage Users</h1>
              <p>View, verify, block or delete student accounts</p>
            </div>
            <div className="stats-grid">
              <StatCard icon="👥" number={users.length} label="Total Users" color="blue" />
              <StatCard icon="✅" number={users.filter(u => u.verified).length} label="Active" color="green" />
              <StatCard icon="🚫" number={users.filter(u => u.flagged).length} label="Blocked" color="red" />
            </div>
            <div className="card">
              <div className="search-bar" style={{ marginBottom: 16 }}>
                <input className="search-input" placeholder="Search by name or email..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              {loading ? (
                <div className="empty-state"><div className="empty-icon">⏳</div><h3>Loading...</h3></div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th><th>Email</th><th>Role</th>
                        <th>Joined</th><th>Status</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u._id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 34, height: 34, borderRadius: '50%',
                                background: u.role === 'admin' ? '#ef4444' : 'var(--primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontSize: 12, fontWeight: 700
                              }}>
                                {initials(u.name)}
                              </div>
                              <span style={{ fontWeight: 600 }}>{u.name}</span>
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{u.email}</td>
                          <td>
                            <span className={`badge ${u.role === 'admin' ? 'flagged' : 'approved'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td style={{ fontSize: 13 }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td>
                            <span className={`badge ${u.flagged ? 'flagged' : u.verified ? 'approved' : 'pending'}`}>
                              {u.flagged ? '🚫 Blocked' : u.verified ? '✅ Active' : '⏳ Pending'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {!u.verified && !u.flagged && (
                                <button className="btn-sm success" onClick={() => verifyUser(u._id)}>✅ Verify</button>
                              )}
                              {u.verified && !u.flagged && u.role !== 'admin' && (
                                <button className="btn-sm danger" onClick={() => blockUser(u._id)}>🚫 Block</button>
                              )}
                              {u.flagged && (
                                <button className="btn-sm primary" onClick={() => verifyUser(u._id)}>↩ Unblock</button>
                              )}
                              {u.role !== 'admin' && (
                                <button className="btn-sm red" onClick={() => deleteUser(u._id)}>🗑️</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredUsers.length === 0 && (
                    <div className="empty-state"><div className="empty-icon">👥</div><h3>No users found</h3></div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ANALYTICS */}
        {activeTab === 'analytics' && (
          <>
            <div className="page-header">
              <h1>📊 Analytics</h1>
              <p>Overview of campus lost and found activity</p>
            </div>
            {loading ? (
              <div className="empty-state"><div className="empty-icon">⏳</div><h3>Loading analytics...</h3></div>
            ) : analytics ? (
              <>
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
                  <StatCard icon="👥" number={analytics.totalUsers} label="Total Students" color="blue" />
                  <StatCard icon="📋" number={analytics.totalPosts} label="Total Posts" color="orange" />
                  <StatCard icon="💬" number={analytics.totalMessages} label="Messages Sent" color="green" />
                  <StatCard icon="✅" number={analytics.resolvedPosts} label="Resolved" color="green" />
                </div>
                <div className="two-col">
                  <div className="card">
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
                      Lost vs Found
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                      <div style={{ flex: 1, padding: 16, background: '#fef2f2', borderRadius: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#ef4444' }}>{analytics.lostPosts}</div>
                        <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>🔴 Lost</div>
                      </div>
                      <div style={{ flex: 1, padding: 16, background: '#f0fdf4', borderRadius: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#10b981' }}>{analytics.foundPosts}</div>
                        <div style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>🟢 Found</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div style={{ flex: 1, padding: 16, background: '#fefce8', borderRadius: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b' }}>{analytics.pendingPosts}</div>
                        <div style={{ fontSize: 13, color: '#f59e0b', fontWeight: 600 }}>⏳ Pending</div>
                      </div>
                      <div style={{ flex: 1, padding: 16, background: '#fff7ed', borderRadius: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#f97316' }}>{analytics.flaggedPosts}</div>
                        <div style={{ fontSize: 13, color: '#f97316', fontWeight: 600 }}>🚩 Flagged</div>
                      </div>
                    </div>
                  </div>
                  <div className="card">
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
                      Posts by Category
                    </div>
                    {analytics.categoryStats.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data yet</div>
                    ) : (
                      <BarChart data={analytics.categoryStats} labelKey="_id" valueKey="count" color="var(--primary)" />
                    )}
                  </div>
                </div>
                <div className="two-col">
                  <div className="card">
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
                      Top Locations
                    </div>
                    {analytics.locationStats.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data yet</div>
                    ) : (
                      <BarChart data={analytics.locationStats} labelKey="_id" valueKey="count" color="#10b981" />
                    )}
                  </div>
                  <div className="card">
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
                      Posts — Last 7 Days
                    </div>
                    {analytics.dailyStats.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No posts in last 7 days</div>
                    ) : (
                      <BarChart data={analytics.dailyStats} labelKey="_id" valueKey="count" color="#f59e0b" />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <h3>No analytics data yet</h3>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}