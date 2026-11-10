const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { optionalAuth, authenticate } = require('../middleware/authMiddleware');

// Helper to generate unique sequential bill number: BILL-YYYYMMDD-XXXX
function generateBillNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const prefix = `BILL-${year}${month}${day}-`;

  const lastOrder = db.prepare(`
    SELECT bill_no FROM orders 
    WHERE bill_no LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  let nextSeq = 1;
  if (lastOrder && lastOrder.bill_no) {
    const parts = lastOrder.bill_no.split('-');
    const lastSeq = parseInt(parts[2], 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

// POST /api/orders - Create order, check & reduce stock, generate bill
router.post('/', optionalAuth, (req, res) => {
  const { customer_name, customer_phone, payment_method, discount, items } = req.body || {};

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item.' });
  }

  // Sanitize items list
  const parsedItems = [];
  for (const it of items) {
    const id = parseInt(it.itemId || it.id, 10);
    const qty = parseInt(it.quantity || it.qty, 10);
    if (isNaN(id) || isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Invalid item ID or quantity in order.' });
    }
    parsedItems.push({ itemId: id, quantity: qty });
  }

  // Read current canteen settings
  const settingsRows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const s of settingsRows) settings[s.key] = s.value;

  const canteenName = settings.canteen_name || 'Campus Canteen';
  const taxPercent = parseFloat(settings.tax_percent) || 0;
  const currency = settings.currency || 'Rs.';

  let orderResult;

  try {
    const createOrderTx = db.transaction(() => {
      // 1. Verify stock and availability for all items first
      const itemDetails = [];
      let subtotal = 0;

      for (const reqItem of parsedItems) {
        const dbItem = db.prepare(`
          SELECT i.id, i.name, i.price, i.stock, i.is_available, c.name as category
          FROM items i
          JOIN categories c ON i.category_id = c.id
          WHERE i.id = ?
        `).get(reqItem.itemId);

        if (!dbItem) {
          throw new Error(`Item ID ${reqItem.itemId} not found in menu.`);
        }

        if (!dbItem.is_available) {
          throw new Error(`"${dbItem.name}" is currently marked as unavailable/sold out.`);
        }

        if (dbItem.stock < reqItem.quantity) {
          throw new Error(`Insufficient stock for "${dbItem.name}". Available: ${dbItem.stock}, Requested: ${reqItem.quantity}.`);
        }

        const lineAmount = dbItem.price * reqItem.quantity;
        subtotal += lineAmount;

        itemDetails.push({
          itemId: dbItem.id,
          name: dbItem.name,
          category: dbItem.category,
          price: dbItem.price,
          quantity: reqItem.quantity,
          amount: lineAmount
        });
      }

      // 2. Calculations
      let discountAmount = 0;
      if (discount !== undefined && discount !== null) {
        const discVal = parseFloat(discount);
        if (!isNaN(discVal) && discVal >= 0) {
          discountAmount = discVal;
        }
      }

      const taxableAmount = Math.max(0, subtotal - discountAmount);
      const taxAmount = parseFloat(((taxableAmount * taxPercent) / 100).toFixed(2));
      const grandTotal = parseFloat((taxableAmount + taxAmount).toFixed(2));

      const billNo = generateBillNumber();
      const cashierId = req.user ? req.user.id : null;
      const payMethod = (payment_method || 'Cash').trim();
      const custName = (customer_name || 'Walk-in Customer').trim();
      const custPhone = (customer_phone || '').trim();

      // 3. Insert order
      const orderInsert = db.prepare(`
        INSERT INTO orders (
          bill_no, cashier_id, customer_name, customer_phone,
          subtotal, tax, discount, total, payment_method
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        billNo,
        cashierId,
        custName,
        custPhone,
        subtotal,
        taxAmount,
        discountAmount,
        grandTotal,
        payMethod
      );

      const orderId = orderInsert.lastInsertRowid;

      // 4. Insert order_items and reduce stock
      const insertOrderItem = db.prepare(`
        INSERT INTO order_items (order_id, item_id, quantity, price)
        VALUES (?, ?, ?, ?)
      `);

      const decrementStock = db.prepare(`
        UPDATE items SET stock = stock - ? WHERE id = ?
      `);

      for (const it of itemDetails) {
        insertOrderItem.run(orderId, it.itemId, it.quantity, it.price);
        decrementStock.run(it.quantity, it.itemId);
      }

      const cashierName = req.user ? req.user.username : 'Staff';

      return {
        id: orderId,
        bill_no: billNo,
        cashier_id: cashierId,
        cashier_name: cashierName,
        customer_name: custName,
        customer_phone: custPhone,
        canteen_name: canteenName,
        currency,
        subtotal,
        tax_percent: taxPercent,
        tax: taxAmount,
        discount: discountAmount,
        total: grandTotal,
        payment_method: payMethod,
        items: itemDetails,
        created_at: new Date().toISOString()
      };
    });

    orderResult = createOrderTx();
    res.status(201).json(orderResult);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// GET /api/orders - Order history with search & filter
router.get('/', (req, res) => {
  const { date_from, date_to, cashier_id, payment_method, q } = req.query;

  let query = `
    SELECT 
      o.id, o.bill_no, o.cashier_id, u.username as cashier_name,
      o.customer_name, o.customer_phone,
      o.subtotal, o.tax, o.discount, o.total,
      o.payment_method, o.created_at
    FROM orders o
    LEFT JOIN users u ON o.cashier_id = u.id
  `;
  const conditions = [];
  const params = [];

  if (date_from) {
    conditions.push('DATE(o.created_at) >= DATE(?)');
    params.push(date_from);
  }
  if (date_to) {
    conditions.push('DATE(o.created_at) <= DATE(?)');
    params.push(date_to);
  }
  if (cashier_id) {
    conditions.push('o.cashier_id = ?');
    params.push(cashier_id);
  }
  if (payment_method) {
    conditions.push('LOWER(o.payment_method) = LOWER(?)');
    params.push(payment_method);
  }
  if (q) {
    conditions.push('(o.bill_no LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ?)');
    const term = `%${q.trim()}%`;
    params.push(term, term, term);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY o.id DESC';

  const orders = db.prepare(query).all(...params);

  // Attach items to each order
  const getItemDetails = db.prepare(`
    SELECT oi.id, oi.item_id, i.name, c.name as category, oi.quantity, oi.price, (oi.quantity * oi.price) as amount
    FROM order_items oi
    JOIN items i ON oi.item_id = i.id
    JOIN categories c ON i.category_id = c.id
    WHERE oi.order_id = ?
  `);

  const enrichedOrders = orders.map((ord) => {
    const items = getItemDetails.all(ord.id);
    const itemsSummary = items.map(it => `${it.name} (x${it.quantity})`).join(', ');
    return {
      ...ord,
      items,
      items_summary: itemsSummary
    };
  });

  res.json(enrichedOrders);
});

// GET /api/orders/:id - Single order detail for receipt / reprint
router.get('/:id', (req, res) => {
  const order = db.prepare(`
    SELECT 
      o.id, o.bill_no, o.cashier_id, u.username as cashier_name,
      o.customer_name, o.customer_phone,
      o.subtotal, o.tax, o.discount, o.total,
      o.payment_method, o.created_at
    FROM orders o
    LEFT JOIN users u ON o.cashier_id = u.id
    WHERE o.id = ? OR o.bill_no = ?
  `).get(req.params.id, req.params.id);

  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const items = db.prepare(`
    SELECT oi.id, oi.item_id, i.name, c.name as category, oi.quantity, oi.price, (oi.quantity * oi.price) as amount
    FROM order_items oi
    JOIN items i ON oi.item_id = i.id
    JOIN categories c ON i.category_id = c.id
    WHERE oi.order_id = ?
  `).all(order.id);

  const settingsRows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const s of settingsRows) settings[s.key] = s.value;

  res.json({
    ...order,
    items,
    canteen_name: settings.canteen_name || 'Campus Canteen',
    currency: settings.currency || 'Rs.'
  });
});

module.exports = router;

