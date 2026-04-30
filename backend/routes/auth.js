const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../models/db');

const router = express.Router();

/**
 * POST /api/auth/login
 * Authenticates a user by username and password.
 * Sets session data on success and returns user info.
 * Body: { username, password }
 */
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Set session data
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;

    return res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout
 * Destroys the user session and logs them out.
 */
router.post('/logout', (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: 'Failed to logout' });
      }
      res.clearCookie('connect.sid');
      return res.json({ success: true });
    });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/check
 * Checks if the current session is authenticated.
 * Returns user info if authenticated, or authenticated: false.
 */
router.get('/check', (req, res) => {
  try {
    if (!req.session.userId) {
      return res.json({ authenticated: false });
    }

    return res.json({
      authenticated: true,
      user: {
        id: req.session.userId,
        username: req.session.username,
        role: req.session.role
      }
    });
  } catch (err) {
    console.error('Auth check error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
