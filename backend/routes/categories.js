const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

// GET /api/categories
router.get('/', (req, res) => {
  const categories = db.prepare(`
    SELECT c.id, c.name, COUNT(i.id) as item_count
    FROM categories c
    LEFT JOIN items i ON c.id = i.category_id
    GROUP BY c.id
    ORDER BY c.name ASC
  `).all();
  res.json(categories);
});

// POST /api/categories (Admin only)
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  const trimmed = name.trim();
  const existing = db.prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)').get(trimmed);
  if (existing) {
    return res.status(400).json({ error: 'A category with this name already exists.' });
  }

  const result = db.prepare('INSERT INTO categories (name) VALUES (?)').run(trimmed);
  const newCat = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: 'Category created successfully.', category: newCat });
});

// PUT /api/categories/:id (Admin only)
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const { name } = req.body || {};
  const catId = req.params.id;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  const existing = db.prepare('SELECT id FROM categories WHERE id = ?').get(catId);
  if (!existing) {
    return res.status(404).json({ error: 'Category not found.' });
  }

  const trimmed = name.trim();
  const duplicate = db.prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND id != ?').get(trimmed, catId);
  if (duplicate) {
    return res.status(400).json({ error: 'Another category with this name already exists.' });
  }

  db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(trimmed, catId);
  const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(catId);
  res.json({ message: 'Category updated successfully.', category: updated });
});

// DELETE /api/categories/:id (Admin only)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const catId = req.params.id;
  const existing = db.prepare('SELECT id FROM categories WHERE id = ?').get(catId);
  if (!existing) {
    return res.status(404).json({ error: 'Category not found.' });
  }

  const itemCount = db.prepare('SELECT COUNT(*) as count FROM items WHERE category_id = ?').get(catId).count;
  if (itemCount > 0) {
    return res.status(400).json({
      error: `Cannot delete category because it contains ${itemCount} item(s). Reassign or remove items first.`
    });
  }

  db.prepare('DELETE FROM categories WHERE id = ?').run(catId);
  res.json({ message: 'Category deleted successfully.' });
});

module.exports = router;

