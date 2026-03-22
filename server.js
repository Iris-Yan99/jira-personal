const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);
const db = require('./db');
const requireAuth = require('./middleware/requireAuth');

const app = express();

// CORS — allow credentials for dev (Vite at :5173)
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Session middleware
app.use(session({
  store: new SqliteStore({ client: db }),
  secret: process.env.SESSION_SECRET || 'myjira-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}));

// Auth routes — public (login/logout/me)
app.use('/api/auth', require('./routes/auth'));

// All other API routes — protected
app.use('/api/tasks', requireAuth, require('./routes/tasks'));
app.use('/api/logs', requireAuth, require('./routes/logs'));
app.use('/api/reports', requireAuth, require('./routes/reports'));
app.use('/api/task-logs', requireAuth, require('./routes/task-logs'));
app.use('/api/ai', requireAuth, require('./routes/ai'));
app.use('/api/upload', requireAuth, require('./routes/upload'));
app.use('/api/members', requireAuth, require('./routes/members'));
app.use('/api/dependencies', requireAuth, require('./routes/dependencies'));

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'client', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
