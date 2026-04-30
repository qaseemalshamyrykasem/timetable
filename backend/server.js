const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(session({
  secret: 'school-timetable-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./middleware/auth'), require('./routes/students'));
app.use('/api/teachers', require('./middleware/auth'), require('./routes/teachers'));
app.use('/api/subjects', require('./middleware/auth'), require('./routes/subjects'));
app.use('/api/classrooms', require('./middleware/auth'), require('./routes/classrooms'));
app.use('/api/timetable', require('./middleware/auth'), require('./routes/timetable'));
app.use('/api/export', require('./middleware/auth'), require('./routes/export'));

// Serve frontend for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Initialize database
const db = require('./models/db');

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
