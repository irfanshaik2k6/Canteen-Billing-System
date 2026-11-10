const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

// GET /api/items (all items or filtered by availability)
router.get('/', (req, res) => {
  const { available_only, category_id } = req.query;

  let query = `
    SELECT i.id, i.name, i.category_id, c.name AS category, i.price, i.stock, i.is_available
    FROM items i
    JOIN categories c ON i.category_id = c.id
  `;
  const params = [];
  const conditions = [];

  if (available_only === 'true' || available_only === '1') {
    conditions.push('i.is_available = 1');
  }

  if (category_id) {
    conditions.push('i.category_id = ?');
    params.push(category_id);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY c.name ASC, i.name ASC';

  const items = db.prepare(query).all(...params);
  res.json(items);
});

// GET /api/items/:id
router.get('/:id', (req, res) => {
  const item = db.prepare(`
    SELECT i.id, i.name, i.category_id, c.name AS category, i.price, i.stock, i.is_available
    FROM items i
    JOIN categories c ON i.category_id = c.id
    WHERE i.id = ?
  `).get(req.params.id);

  if (!item) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  res.json(item);
});

// POST /api/items (Admin only)
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { name, category_id, price, stock, is_available } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Item name is required.' });
  }
  if (!category_id) {
    return res.status(400).json({ error: 'Category ID is required.' });
  }
  const numPrice = parseFloat(price);
  if (isNaN(numPrice) || numPrice < 0) {
    return res.status(400).json({ error: 'Valid item price is required.' });
  }

  const numStock = parseInt(stock, 10);
  const stockVal = isNaN(numStock) ? 0 : Math.max(0, numStock);
  const availableVal = is_available === undefined || is_available === null ? 1 : (is_available ? 1 : 0);

  // Check category exists
  const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id);
  if (!cat) {
    return res.status(400).json({ error: 'Invalid category ID specified.' });
  }

  const result = db.prepare(`
    INSERT INTO items (name, category_id, price, stock, is_available)
    VALUES (?, ?, ?, ?, ?)
  `).run(name.trim(), category_id, numPrice, stockVal, availableVal);

  const newItem = db.prepare(`
    SELECT i.id, i.name, i.category_id, c.name AS category, i.price, i.stock, i.is_available
    FROM items i
    JOIN categories c ON i.category_id = c.id
    WHERE i.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({
    message: 'Item created successfully.',
    item: newItem
  });
});

// PUT /api/items/:id (Admin only)
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const { name, category_id, price, stock, is_available } = req.body || {};
  const itemId = req.params.id;

  const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
  if (!existing) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  const updatedName = name !== undefined ? name.trim() : existing.name;
  if (!updatedName) {
    return res.status(400).json({ error: 'Item name cannot be empty.' });
  }

  let updatedCatId = existing.category_id;
  if (category_id !== undefined) {
    const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id);
    if (!cat) {
      return res.status(400).json({ error: 'Invalid category ID.' });
    }
    updatedCatId = category_id;
  }

  let updatedPrice = existing.price;
  if (price !== undefined) {
    const p = parseFloat(price);
    if (isNaN(p) || p < 0) {
      return res.status(400).json({ error: 'Valid price is required.' });
    }
    updatedPrice = p;
  }

  let updatedStock = existing.stock;
  if (stock !== undefined) {
    const s = parseInt(stock, 10);
    if (isNaN(s) || s < 0) {
      return res.status(400).json({ error: 'Valid stock number is required.' });
    }
    updatedStock = s;
  }

  let updatedAvailable = existing.is_available;
  if (is_available !== undefined) {
    updatedAvailable = is_available ? 1 : 0;
  }

  db.prepare(`
    UPDATE items 
    SET name = ?, category_id = ?, price = ?, stock = ?, is_available = ?
    WHERE id = ?
  `).run(updatedName, updatedCatId, updatedPrice, updatedStock, updatedAvailable, itemId);

  const updatedItem = db.prepare(`
    SELECT i.id, i.name, i.category_id, c.name AS category, i.price, i.stock, i.is_available
    FROM items i
    JOIN categories c ON i.category_id = c.id
    WHERE i.id = ?
  `).get(itemId);

  res.json({
    message: 'Item updated successfully.',
    item: updatedItem
  });
});

// DELETE /api/items/:id (Admin only)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const itemId = req.params.id;
  const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
  if (!existing) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  // Check if order_items references this item
  const orderedCount = db.prepare('SELECT COUNT(*) as count FROM order_items WHERE item_id = ?').get(itemId).count;
  if (orderedCount > 0) {
    // Soft delete to preserve past order history integrity
    db.prepare('UPDATE items SET is_available = 0 WHERE id = ?').run(itemId);
    return res.json({
      message: 'Item is linked to past orders and has been deactivated (marked unavailable) instead of permanently deleted.',
      softDeleted: true
    });
  }

  db.prepare('DELETE FROM items WHERE id = ?').run(itemId);
  res.json({ message: 'Item deleted permanently.' });
});

module.exports = router;

