const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { dbPath } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

// GET /api/backup (Admin only - downloads canteen.db)
router.get('/', authenticate, requireAdmin, (req, res) => {
  if (!fs.existsSync(dbPath)) {
    return res.status(404).json({ error: 'Database file not found.' });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `canteen_backup_${timestamp}.db`;

  res.download(dbPath, filename, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ error: 'Failed to download database backup.' });
    }
  });
});

module.exports = router;

