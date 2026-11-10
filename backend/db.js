const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'canteen.db');
const db = new Database(dbPath);

// Enable WAL mode and foreign key constraints
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'cashier')),
      is_active INTEGER NOT NULL DEFAULT 1,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      is_available INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_no TEXT UNIQUE NOT NULL,
      cashier_id INTEGER REFERENCES users(id),
      customer_name TEXT,
      customer_phone TEXT,
      subtotal REAL NOT NULL,
      tax REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      payment_method TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES items(id),
      quantity INTEGER NOT NULL,
      price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Seed default settings if not exists
  const defaultSettings = [
    { key: 'canteen_name', value: 'Campus Canteen' },
    { key: 'tax_percent', value: '5' },
    { key: 'default_discount', value: '0' },
    { key: 'currency', value: 'Rs.' }
  ];

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const s of defaultSettings) {
    insertSetting.run(s.key, s.value);
  }

  // Seed default admin and sample cashier
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const adminHash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (username, password_hash, role, is_active, must_change_password)
      VALUES (?, ?, 'admin', 1, 1)
    `).run('admin', adminHash);
  }

  const cashierExists = db.prepare('SELECT id FROM users WHERE username = ?').get('cashier1');
  if (!cashierExists) {
    const cashierHash = bcrypt.hashSync('cashier123', 10);
    db.prepare(`
      INSERT INTO users (username, password_hash, role, is_active, must_change_password)
      VALUES (?, ?, 'cashier', 1, 0)
    `).run('cashier1', cashierHash);
  }

  // Seed categories
  const categories = ['Beverage', 'Snack', 'Meal', 'Special Meal'];
  const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
  for (const cat of categories) {
    insertCategory.run(cat);
  }

  // Seed sample menu items
  const itemsCount = db.prepare('SELECT COUNT(*) as count FROM items').get().count;
  if (itemsCount === 0) {
    const catMap = {};
    const allCats = db.prepare('SELECT id, name FROM categories').all();
    for (const c of allCats) {
      catMap[c.name.toLowerCase()] = c.id;
    }

    const sampleItems = [
      { name: 'Tea', category: 'beverage', price: 15.00, stock: 100 },
      { name: 'Coffee', category: 'beverage', price: 25.00, stock: 100 },
      { name: 'Fruit Juice', category: 'beverage', price: 40.00, stock: 50 },
      { name: 'Samosa', category: 'snack', price: 20.00, stock: 60 },
      { name: 'Puff', category: 'snack', price: 25.00, stock: 50 },
      { name: 'Sandwich', category: 'snack', price: 50.00, stock: 40 },
      { name: 'Veg Meals', category: 'meal', price: 90.00, stock: 30 },
      { name: 'Chapati Curry', category: 'meal', price: 70.00, stock: 35 },
      { name: 'Chicken Biryani', category: 'special meal', price: 160.00, stock: 25 }
    ];

    const insertItem = db.prepare(`
      INSERT INTO items (name, category_id, price, stock, is_available)
      VALUES (?, ?, ?, ?, 1)
    `);

    for (const item of sampleItems) {
      const catId = catMap[item.category];
      if (catId) {
        insertItem.run(item.name, catId, item.price, item.stock);
      }
    }
  }
}

initDatabase();

module.exports = { db, dbPath };

