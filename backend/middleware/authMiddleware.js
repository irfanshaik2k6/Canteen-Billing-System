const jwt = require('jsonwebtoken');
const { db } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'canteen_super_secret_jwt_key_2026_x98f2';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Verify user in DB and ensure active
    const user = db.prepare('SELECT id, username, role, is_active, must_change_password FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'User account is disabled.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// Optional authentication: sets req.user if token present, but doesn't fail if absent
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.prepare('SELECT id, username, role, is_active, must_change_password FROM users WHERE id = ?').get(decoded.id);
      if (user && user.is_active) {
        req.user = user;
      }
    } catch (e) {
      // Ignore invalid token in optional auth
    }
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin privileges required.' });
  }
  next();
}

module.exports = {
  authenticate,
  optionalAuth,
  requireAdmin,
  JWT_SECRET
};

