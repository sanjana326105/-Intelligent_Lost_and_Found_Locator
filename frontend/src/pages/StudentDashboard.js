import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import '../styles/dashboard.css';

const API = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

  export default function StudentDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const [activeTab, setActiveTab] = useState('listings');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [form, setForm] = useState({
    type: 'lost', title: '', description: '',
    category: '', location: '', date_reported: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  const [socket, setSocket] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [convLoading, setConvLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const logout = () => {
    if (socket) socket.disconnect();
    localStorage.clear();
    navigate('/login');
  };

  const showAlert = (msg, type = 'success') => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 3500);
  };

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    newSocket.emit('join', user.id);
    setSocket(newSocket);

    newSocket.on('receiveMessage', (message) => {
      if (message.senderId?.toString() !== user.id?.toString()) {
        setMessages(prev => [...prev, message]);
        fetchConversations();
      }
    });

    newSocket.on('messageSent', (message) => {
      setMessages(prev => {
        const exists = prev.find(m => m._id === message._id);
        if (exists) return prev;
        return [...prev, message];
      });
    });

    return () => newSocket.disconnect();
  }, [user.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = useCallback(async () => {
    setConvLoading(true);
    try {
      const res = await axios.get(`${API}/messages/conversations`, authHeader);
      setConversations(res.data);
    } catch (err) {
      console.log('Failed to load conversations');
    } finally {
      setConvLoading(false);
    }
  }, [token]);

  const fetchMessages = async (partnerId) => {
    try {
      const res = await axios.get(`${API}/messages/${partnerId}`, authHeader);
      setMessages(res.data);
    } catch (err) {
      showAlert('Failed to load messages.', 'error');
    }
  };

  const openConversation = (conv) => {
    setActiveConv(conv);
    fetchMessages(conv.partnerId);
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !activeConv || !socket) return;
    socket.emit('sendMessage', {
      senderId: user.id,
      senderName: user.name,
      receiverId: activeConv.partnerId,
      receiverName: activeConv.partnerName,
      content: newMessage.trim(),
    });
    setNewMessage('');
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') params.type = filter;
      if (search) params.search = search;
      const res = await axios.get(`${API}/posts`, { params });
      setItems(res.data);
    } catch (err) {
      showAlert('Failed to load posts.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  const fetchMyPosts = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/posts/myposts`, authHeader);
      setMyPosts(res.data);
    } catch (err) {
      showAlert('Failed to load your posts.', 'error');
    }
  }, [token]);

  const fetchMatches = useCallback(async () => {
    setMatchLoading(true);
    try {
      const res = await axios.get(`${API}/matches`, authHeader);
      setMatches(res.data.matches || []);
    } catch (err) {
      showAlert('Failed to load matches.', 'error');
    } finally {
      setMatchLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'listings') fetchItems();
    if (activeTab === 'myposts') fetchMyPosts();
    if (activeTab === 'matches') fetchMatches();
    if (activeTab === 'messages') fetchConversations();
  }, [activeTab, fetchItems, fetchMyPosts, fetchMatches, fetchConversations]);

  const handlePost = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("type", form.type);
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("category", form.category);
      formData.append("location", form.location);
      formData.append("date_reported", form.date_reported);
      if (imageFile) formData.append("image", imageFile);

      await axios.post(`${API}/posts`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });

      setForm({ type: 'lost', title: '', description: '', category: '', location: '', date_reported: '' });
      setImageFile(null);
      setImagePreview(null);
      showAlert('Post submitted! Waiting for admin approval.');
      setActiveTab('myposts');
    } catch (err) {
      showAlert(err.response?.data?.message || 'Failed to submit.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/posts/${id}`, authHeader);
      setMyPosts(prev => prev.filter(p => p._id !== id));
      showAlert('Post deleted.');
    } catch (err) {
      showAlert('Failed to delete.', 'error');
    }
  };

  // ✅ NEW
  const handleResolve = async (id) => {
    try {
      await axios.put(`${API}/posts/${id}/resolve`, {}, authHeader);
      setMyPosts(prev => prev.map(p => p._id === id ? { ...p, status: 'resolved' } : p));
      showAlert('🎉 Item marked as resolved! Glad you got it back!');
    } catch (err) {
      showAlert('Failed to resolve.', 'error');
    }
  };

  const handleFlag = async (id) => {
    try {
      await axios.put(`${API}/posts/${id}/flag`, {}, authHeader);
      setItems(prev => prev.filter(p => p._id !== id));
      showAlert('Post reported to admin.');
    } catch (err) {
      showAlert('Failed to report.', 'error');
    }
  };

  const initials = (name) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const MatchScoreBar = ({ percent }) => (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Match Score</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: percent >= 70 ? 'var(--success)' : percent >= 40 ? 'var(--accent)' : 'var(--text-muted)' }}>
          {percent}%
        </span>
      </div>
      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${percent}%`, borderRadius: 10,
          background: percent >= 70 ? 'var(--success)' : percent >= 40 ? 'var(--accent)' : '#94a3b8',
          transition: 'width 0.6s ease'
        }} />
      </div>
    </div>
  );

  return (
    <div className="dash-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">Campus<span>Connect</span></div>
        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'listings' ? 'active' : ''}`} onClick={() => setActiveTab('listings')}>
            <span className="nav-icon">🔍</span> Browse Listings
          </button>
          <button className={`nav-item ${activeTab === 'matches' ? 'active' : ''}`} onClick={() => setActiveTab('matches')}>
            <span className="nav-icon">✨</span> My Matches
            {matches.length > 0 && (
              <span style={{ marginLeft: 'auto', background: '#f59e0b', color: 'white', borderRadius: '10px', padding: '1px 7px', fontSize: '11px' }}>
                {matches.length}
              </span>
            )}
          </button>
          <button className={`nav-item ${activeTab === 'post' ? 'active' : ''}`} onClick={() => setActiveTab('post')}>
            <span className="nav-icon">➕</span> Post Item
          </button>
          <button className={`nav-item ${activeTab === 'myposts' ? 'active' : ''}`} onClick={() => setActiveTab('myposts')}>
            <span className="nav-icon">📋</span> My Posts
          </button>
          <button className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
            <span className="nav-icon">💬</span> Messages
            {conversations.reduce((acc, c) => acc + c.unreadCount, 0) > 0 && (
              <span style={{ marginLeft: 'auto', background: '#6366f1', color: 'white', borderRadius: '10px', padding: '1px 7px', fontSize: '11px' }}>
                {conversations.reduce((acc, c) => acc + c.unreadCount, 0)}
              </span>
            )}
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{initials(user.name)}</div>
            <div>
              <div className="user-name">{user.name || 'Student'}</div>
              <div className="user-role">Student</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

        {/* BROWSE LISTINGS */}
        {activeTab === 'listings' && (
          <>
            <div className="page-header">
              <h1>Browse Listings</h1>
              <p>Search through lost and found items on campus</p>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon blue">🔴</div>
                <div>
                  <div className="stat-number">{items.filter(i => i.type === 'lost').length}</div>
                  <div className="stat-label">Lost Items</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green">🟢</div>
                <div>
                  <div className="stat-number">{items.filter(i => i.type === 'found').length}</div>
                  <div className="stat-label">Found Items</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon orange">📦</div>
                <div>
                  <div className="stat-number">{items.length}</div>
                  <div className="stat-label">Total Posts</div>
                </div>
              </div>
            </div>
            <div className="search-bar">
              <input className="search-input" placeholder="Search items..."
                value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchItems()} />
              <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
              <button className={`filter-btn ${filter === 'lost' ? 'active' : ''}`} onClick={() => setFilter('lost')}>🔴 Lost</button>
              <button className={`filter-btn ${filter === 'found' ? 'active' : ''}`} onClick={() => setFilter('found')}>🟢 Found</button>
              <button className="btn-sm primary" onClick={fetchItems}>Search</button>
            </div>
            {loading ? (
              <div className="empty-state"><div className="empty-icon">⏳</div><h3>Loading...</h3></div>
            ) : items.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔎</div>
                <h3>No items found</h3>
                <p>Try changing your search or filter</p>
              </div>
            ) : (
              <div className="items-grid">
                {items.map(item => (
                  <div className="item-card" key={item._id}>
                    {item.image_url && (
                      <img src={item.image_url} alt={item.title}
                        style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 10, marginBottom: 10 }} />
                    )}
                    <span className={`item-badge ${item.type}`}>
                      {item.type === 'lost' ? '🔴 Lost' : '🟢 Found'}
                    </span>
                    <div className="item-title">{item.title}</div>
                    <div className="item-desc">{item.description}</div>
                    <div className="item-meta">
                      <span>📍 {item.location}</span>
                      <span>🏷️ {item.category}</span>
                      <span>📅 {new Date(item.date_reported).toLocaleDateString()}</span>
                      <span>👤 {item.postedByName}</span>
                    </div>
                    <div className="item-actions">
                      <button className="btn-sm primary" onClick={() => {
                        setActiveConv({ partnerId: item.postedBy, partnerName: item.postedByName });
                        fetchMessages(item.postedBy);
                        setActiveTab('messages');
                      }}>💬 Contact</button>
                      <button className="btn-sm danger" onClick={() => handleFlag(item._id)}>🚩 Report</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* MATCHES */}
        {activeTab === 'matches' && (
          <>
            <div className="page-header">
              <h1>✨ My Matches</h1>
              <p>Auto-suggested found items that may match your lost posts</p>
            </div>
            {matchLoading ? (
              <div className="empty-state"><div className="empty-icon">⏳</div><h3>Finding matches...</h3></div>
            ) : matches.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔮</div>
                <h3>No matches yet</h3>
                <p>Post a lost item first — we'll automatically find similar found items!</p>
                <button className="btn-sm primary" style={{ marginTop: 16 }} onClick={() => setActiveTab('post')}>
                  ➕ Post Lost Item
                </button>
              </div>
            ) : (
              <div className="items-grid">
                {matches.map((match, idx) => (
                  <div className="item-card" key={idx} style={{ borderTop: '3px solid var(--success)' }}>
                    <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Your lost item</div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>🔴 {match.lostPost.title}</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', marginBottom: 8 }}>⬇ Possible match:</div>
                    {match.foundPost.image_url && (
                      <img src={match.foundPost.image_url} alt={match.foundPost.title}
                        style={{ width: '100%', height: 130, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} />
                    )}
                    <span className="item-badge found">🟢 Found</span>
                    <div className="item-title">{match.foundPost.title}</div>
                    <div className="item-desc">{match.foundPost.description}</div>
                    <div className="item-meta">
                      <span>📍 {match.foundPost.location}</span>
                      <span>👤 {match.foundPost.postedByName}</span>
                    </div>
                    <MatchScoreBar percent={match.matchPercent} />
                    <div className="item-actions" style={{ marginTop: 12 }}>
                      <button className="btn-sm primary" onClick={() => {
                        setActiveConv({ partnerId: match.foundPost.postedBy, partnerName: match.foundPost.postedByName });
                        fetchMessages(match.foundPost.postedBy);
                        setActiveTab('messages');
                      }}>💬 Contact Finder</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* POST ITEM */}
        {activeTab === 'post' && (
          <>
            <div className="page-header">
              <h1>Post an Item</h1>
              <p>Report a lost item or something you found on campus</p>
            </div>
            <div className="card" style={{ maxWidth: 620 }}>
              <form onSubmit={handlePost}>
                <div className="form-group">
                  <label>Item Status</label>
                  <div className="type-toggle">
                    <button type="button" className={`type-btn lost ${form.type === 'lost' ? 'active' : ''}`} onClick={() => setForm({ ...form, type: 'lost' })}>🔴 I Lost Something</button>
                    <button type="button" className={`type-btn found ${form.type === 'found' ? 'active' : ''}`} onClick={() => setForm({ ...form, type: 'found' })}>🟢 I Found Something</button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Item Title</label>
                  <input placeholder="e.g. Black backpack with red stripes"
                    value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea rows={3} placeholder="Describe the item — color, brand, contents..."
                    value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required>
                      <option value="">Select category</option>
                      <option>Electronics</option><option>Bags</option>
                      <option>Documents</option><option>Clothing</option>
                      <option>Keys</option><option>Stationery</option><option>Others</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <select value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} required>
                      <option value="">Select location</option>
                      <option>Library Block</option><option>Cafeteria</option>
                      <option>CS Lab</option><option>Block A</option>
                      <option>Block B</option><option>Block C</option>
                      <option>Parking Area</option><option>Sports Ground</option>
                      <option>Auditorium</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" value={form.date_reported}
                    onChange={e => setForm({ ...form, date_reported: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Upload Image (Optional)</label>
                  <div className="upload-box" onClick={() => document.getElementById('imageInput').click()}>
                    {imagePreview ? (
                      <img src={imagePreview} alt="preview"
                        style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8 }} />
                    ) : (
                      <>
                        <div style={{ fontSize: 32 }}>📷</div>
                        <p>Click to upload an image</p>
                        <p style={{ fontSize: 11, marginTop: 4, color: 'var(--text-muted)' }}>JPG, PNG, WEBP — max 5MB</p>
                      </>
                    )}
                  </div>
                  <input id="imageInput" type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
                    }} />
                  {imagePreview && (
                    <button type="button" className="btn-sm danger" style={{ marginTop: 8 }}
                      onClick={() => { setImageFile(null); setImagePreview(null); }}>
                      ✕ Remove Image
                    </button>
                  )}
                </div>
                <button className="btn-submit" type="submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : '📤 Submit Post'}
                </button>
              </form>
            </div>
          </>
        )}

        {/* MY POSTS */}
        {activeTab === 'myposts' && (
          <>
            <div className="page-header">
              <h1>My Posts</h1>
              <p>Manage your lost and found submissions</p>
            </div>
            {myPosts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>No posts yet</h3>
                <p>Go to Post Item to create your first listing</p>
              </div>
            ) : (
              <div className="items-grid">
                {myPosts.map(item => (
                  <div className="item-card" key={item._id}>
                    {item.image_url && (
                      <img src={item.image_url} alt={item.title}
                        style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 10, marginBottom: 10 }} />
                    )}
                    <span className={`item-badge ${item.type}`}>
                      {item.type === 'lost' ? '🔴 Lost' : '🟢 Found'}
                    </span>
                    <div className="item-title">{item.title}</div>
                    <div className="item-desc">{item.description}</div>
                    <div className="item-meta">
                      <span>📍 {item.location}</span>
                      <span>📅 {new Date(item.date_reported).toLocaleDateString()}</span>
                    </div>
                    {/* ✅ UPDATED with resolve button */}
                    <div className="item-actions">
                      <button className="btn-sm danger" onClick={() => handleDelete(item._id)}>🗑️ Delete</button>
                      {item.status === 'approved' && (
                        <button className="btn-sm success" onClick={() => handleResolve(item._id)}>✅ Mark Resolved</button>
                      )}
                      <span className={`badge ${item.status}`} style={{ marginLeft: 'auto', alignSelf: 'center' }}>
                        {item.status === 'resolved' ? '✅ Resolved' : item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* MESSAGES */}
        {activeTab === 'messages' && (
          <>
            <div className="page-header">
              <h1>Messages</h1>
              <p>Real-time chat with other students</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, height: '65vh' }}>
              <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14 }}>
                  Conversations
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {convLoading ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
                  ) : conversations.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                      No conversations yet.<br />Contact someone from a listing!
                    </div>
                  ) : (
                    conversations.map(conv => (
                      <div key={conv.partnerId} onClick={() => openConversation(conv)}
                        style={{
                          padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                          background: activeConv?.partnerId === conv.partnerId ? 'var(--primary-light)' : 'white',
                          transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: 12
                        }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0
                        }}>
                          {conv.partnerName?.[0]?.toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                            <span>{conv.partnerName}</span>
                            {conv.unreadCount > 0 && (
                              <span style={{ background: 'var(--primary)', color: 'white', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {conv.lastMessage}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {!activeConv ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontSize: 48 }}>💬</div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Select a conversation</div>
                    <div style={{ fontSize: 13 }}>Or contact someone from a listing</div>
                  </div>
                ) : (
                  <>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>
                        {activeConv.partnerName?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{activeConv.partnerName}</div>
                        <div style={{ fontSize: 12, color: 'var(--success)' }}>● Online</div>
                      </div>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {messages.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 40 }}>
                          No messages yet. Say hello! 👋
                        </div>
                      ) : (
                        messages.map((msg, idx) => {
                          const isMine = msg.senderId?.toString() === user.id?.toString();
                          return (
                            <div key={idx} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                              <div style={{
                                maxWidth: '70%', padding: '10px 14px',
                                borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                background: isMine ? 'var(--primary)' : '#f1f5f9',
                                color: isMine ? 'white' : 'var(--text)',
                                fontSize: 14, lineHeight: 1.5
                              }}>
                                {msg.content}
                                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4, textAlign: 'right' }}>
                                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
                      <input
                        style={{ flex: 1, padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, outline: 'none' }}
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                      />
                      <button onClick={sendMessage}
                        style={{ padding: '10px 20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                        Send
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}