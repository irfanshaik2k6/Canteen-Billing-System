const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

// GET /api/settings (Public or authenticated)
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settingsObj = {};
  for (const row of rows) {
    settingsObj[row.key] = row.value;
  }
  res.json(settingsObj);
});

// PUT /api/settings (Admin only)
router.put('/', authenticate, requireAdmin, (req, res) => {
  const updates = req.body || {};

  const allowedKeys = ['canteen_name', 'tax_percent', 'default_discount', 'currency'];
  const upsert = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  const runUpdates = db.transaction(() => {
    for (const key of allowedKeys) {
      if (updates[key] !== undefined) {
        upsert.run(key, String(updates[key]));
      }
    }
  });

  runUpdates();

  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settingsObj = {};
  for (const row of rows) {
    settingsObj[row.key] = row.value;
  }

  res.json({
    message: 'Settings updated successfully.',
    settings: settingsObj
  });
});

module.exports = router;

