require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { db } = require('./db');

const authRoutes = require('./routes/auth');
const itemsRoutes = require('./routes/items');
const categoriesRoutes = require('./routes/categories');
const usersRoutes = require('./routes/users');
const settingsRoutes = require('./routes/settings');
const ordersRoutes = require('./routes/orders');
const reportsRoutes = require('./routes/reports');
const backupRoutes = require('./routes/backup');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files from web/
const webDir = path.join(__dirname, '..', 'web');
app.use(express.static(webDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/backup', backupRoutes);

// Backward Compatibility Aliases for existing UI / scripts
app.get('/api/menu', (req, res) => {
  const items = db.prepare(`
    SELECT i.id, i.name, i.price, c.name as category, i.stock, i.is_available
    FROM items i
    JOIN categories c ON i.category_id = c.id
    ORDER BY c.name ASC, i.name ASC
  `).all();
  res.json(items);
});

app.post('/api/bill', (req, res, next) => {
  // Delegate directly to orders handler
  req.url = '/';
  ordersRoutes(req, res, next);
});

app.get('/api/history', (req, res) => {
  // Provide text summary of past orders for any legacy modal
  const orders = db.prepare(`
    SELECT o.id, o.bill_no, o.customer_name, o.customer_phone, o.total, o.created_at
    FROM orders o
    ORDER BY o.id DESC LIMIT 50
  `).all();

  const lines = orders.map((o) => {
    return `[${o.created_at}] Bill #${o.bill_no} | ${o.customer_name} (${o.customer_phone}) | Total: Rs. ${o.total.toFixed(2)}`;
  });

  res.json({ history: lines.join('\n') || 'No orders recorded yet.' });
});

// API 404 handler (only for /api routes)
app.use('/api', notFoundHandler);

// Fallback to index.html for non-API GET requests
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(webDir, 'index.html'));
  }
  next();
});

// Global Error Handler
app.use(globalErrorHandler);

// Only listen if run directly (not required as a module)
let server = null;
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🍽️ Canteen Billing System Backend Running`);
    console.log(`🚀 Server listening on: http://localhost:${PORT}`);
    console.log(`📁 Static files served from: ${webDir}`);
    console.log(`===============================================`);
  });
}

module.exports = { app, server };
