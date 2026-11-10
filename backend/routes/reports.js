const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticate } = require('../middleware/authMiddleware');

// Reports accessible to authenticated staff (cashier and admin)
router.use(authenticate);

// GET /api/reports/daily?date=YYYY-MM-DD
router.get('/daily', (req, res) => {
  let targetDate = req.query.date;
  if (!targetDate) {
    const today = new Date();
    targetDate = today.toISOString().slice(0, 10);
  }

  // Summary stats for the day
  const summary = db.prepare(`
    SELECT 
      COUNT(*) as bills_count,
      COALESCE(SUM(total), 0) as total_sales,
      COALESCE(SUM(subtotal), 0) as total_subtotal,
      COALESCE(SUM(tax), 0) as total_tax,
      COALESCE(SUM(discount), 0) as total_discount,
      COALESCE(AVG(total), 0) as avg_bill_value
    FROM orders
    WHERE DATE(created_at) = DATE(?)
  `).get(targetDate);

  // Top selling items for the day
  const topItems = db.prepare(`
    SELECT 
      i.id, i.name, c.name as category,
      SUM(oi.quantity) as total_quantity,
      SUM(oi.quantity * oi.price) as total_revenue
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN items i ON oi.item_id = i.id
    JOIN categories c ON i.category_id = c.id
    WHERE DATE(o.created_at) = DATE(?)
    GROUP BY i.id
    ORDER BY total_quantity DESC
    LIMIT 10
  `).all(targetDate);

  // Payment method split
  const paymentSplit = db.prepare(`
    SELECT 
      payment_method,
      COUNT(*) as count,
      SUM(total) as total
    FROM orders
    WHERE DATE(created_at) = DATE(?)
    GROUP BY payment_method
  `).all(targetDate);

  // Hourly breakdown
  const hourly = db.prepare(`
    SELECT 
      strftime('%H', created_at) as hour,
      COUNT(*) as count,
      SUM(total) as total
    FROM orders
    WHERE DATE(created_at) = DATE(?)
    GROUP BY strftime('%H', created_at)
    ORDER BY hour ASC
  `).all(targetDate);

  res.json({
    date: targetDate,
    summary: {
      bills_count: summary.bills_count,
      total_sales: parseFloat(summary.total_sales.toFixed(2)),
      total_subtotal: parseFloat(summary.total_subtotal.toFixed(2)),
      total_tax: parseFloat(summary.total_tax.toFixed(2)),
      total_discount: parseFloat(summary.total_discount.toFixed(2)),
      avg_bill_value: parseFloat(summary.avg_bill_value.toFixed(2))
    },
    top_selling_items: topItems,
    payment_method_split: paymentSplit,
    hourly_breakdown: hourly
  });
});

// GET /api/reports/monthly?month=YYYY-MM
router.get('/monthly', (req, res) => {
  let targetMonth = req.query.month;
  if (!targetMonth) {
    const today = new Date();
    targetMonth = today.toISOString().slice(0, 7);
  }

  // Summary stats for the month
  const summary = db.prepare(`
    SELECT 
      COUNT(*) as bills_count,
      COALESCE(SUM(total), 0) as total_sales,
      COALESCE(SUM(subtotal), 0) as total_subtotal,
      COALESCE(SUM(tax), 0) as total_tax,
      COALESCE(SUM(discount), 0) as total_discount,
      COALESCE(AVG(total), 0) as avg_bill_value
    FROM orders
    WHERE strftime('%Y-%m', created_at) = ?
  `).get(targetMonth);

  // Top selling items for the month
  const topItems = db.prepare(`
    SELECT 
      i.id, i.name, c.name as category,
      SUM(oi.quantity) as total_quantity,
      SUM(oi.quantity * oi.price) as total_revenue
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN items i ON oi.item_id = i.id
    JOIN categories c ON i.category_id = c.id
    WHERE strftime('%Y-%m', o.created_at) = ?
    GROUP BY i.id
    ORDER BY total_quantity DESC
    LIMIT 10
  `).all(targetMonth);

  // Payment method split
  const paymentSplit = db.prepare(`
    SELECT 
      payment_method,
      COUNT(*) as count,
      SUM(total) as total
    FROM orders
    WHERE strftime('%Y-%m', created_at) = ?
    GROUP BY payment_method
  `).all(targetMonth);

  // Daily sales breakdown across the month (for charts)
  const dailySales = db.prepare(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count,
      SUM(total) as total
    FROM orders
    WHERE strftime('%Y-%m', created_at) = ?
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `).all(targetMonth);

  res.json({
    month: targetMonth,
    summary: {
      bills_count: summary.bills_count,
      total_sales: parseFloat(summary.total_sales.toFixed(2)),
      total_subtotal: parseFloat(summary.total_subtotal.toFixed(2)),
      total_tax: parseFloat(summary.total_tax.toFixed(2)),
      total_discount: parseFloat(summary.total_discount.toFixed(2)),
      avg_bill_value: parseFloat(summary.avg_bill_value.toFixed(2))
    },
    top_selling_items: topItems,
    payment_method_split: paymentSplit,
    daily_sales: dailySales
  });
});

module.exports = router;

