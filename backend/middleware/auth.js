/**
 * Authentication middleware.
 * Checks if the user has an active session (req.session.userId exists).
 * If not authenticated, responds with 401 JSON error.
 */
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

module.exports = requireAuth;
