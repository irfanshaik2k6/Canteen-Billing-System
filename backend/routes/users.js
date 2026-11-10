const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

// All user management routes require admin privileges
router.use(authenticate, requireAdmin);

// GET /api/users
router.get('/', (req, res) => {
  const users = db.prepare(`
    SELECT id, username, role, is_active, must_change_password, created_at
    FROM users
    ORDER BY id ASC
  `).all();
  res.json(users);
});

// POST /api/users (Create user/cashier)
router.post('/', (req, res) => {
  const { username, password, role, is_active } = req.body || {};

  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required.' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password is required and must be at least 6 characters long.' });
  }

  const roleVal = role === 'admin' ? 'admin' : 'cashier';
  const activeVal = is_active === undefined || is_active === null ? 1 : (is_active ? 1 : 0);

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(username.trim());
  if (existing) {
    return res.status(400).json({ error: 'Username already taken.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (username, password_hash, role, is_active, must_change_password)
    VALUES (?, ?, ?, ?, 0)
  `).run(username.trim(), hash, roleVal, activeVal);

  const newUser = db.prepare(`
    SELECT id, username, role, is_active, must_change_password, created_at
    FROM users WHERE id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({
    message: 'User created successfully.',
    user: newUser
  });
});

// PUT /api/users/:id (Update role or active status)
router.put('/:id', (req, res) => {
  const userId = req.params.id;
  const { role, is_active } = req.body || {};

  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!existing) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // Prevent admin from disabling their own account
  if (req.user.id === existing.id && is_active === false) {
    return res.status(400).json({ error: 'You cannot disable your own active account.' });
  }

  let updatedRole = existing.role;
  if (role !== undefined) {
    if (role !== 'admin' && role !== 'cashier') {
      return res.status(400).json({ error: 'Role must be either "admin" or "cashier".' });
    }
    // Prevent last admin from demoting self
    if (existing.role === 'admin' && role !== 'admin') {
      const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1").get().count;
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last active administrator.' });
      }
    }
    updatedRole = role;
  }

  let updatedActive = existing.is_active;
  if (is_active !== undefined) {
    updatedActive = is_active ? 1 : 0;
  }

  db.prepare(`
    UPDATE users SET role = ?, is_active = ? WHERE id = ?
  `).run(updatedRole, updatedActive, userId);

  const updatedUser = db.prepare(`
    SELECT id, username, role, is_active, must_change_password, created_at
    FROM users WHERE id = ?
  `).get(userId);

  res.json({
    message: 'User updated successfully.',
    user: updatedUser
  });
});

// PUT /api/users/:id/reset-password (Admin resets password)
router.put('/:id/reset-password', (req, res) => {
  const userId = req.params.id;
  const { new_password } = req.body || {};

  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!existing) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);

  res.json({ message: 'User password has been reset successfully.' });
});

// DELETE /api/users/:id (Disable or remove user)
router.delete('/:id', (req, res) => {
  const userId = parseInt(req.params.id, 10);

  if (req.user.id === userId) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }

  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!existing) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // Check if orders exist for this user
  const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders WHERE cashier_id = ?').get(userId).count;
  if (orderCount > 0) {
    db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(userId);
    return res.json({
      message: `User has recorded ${orderCount} order(s) and has been disabled to preserve billing audit history.`,
      disabled: true
    });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  res.json({ message: 'User deleted permanently.' });
});

module.exports = router;

