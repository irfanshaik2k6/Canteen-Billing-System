# 🍽️ Canteen Ordering & Billing POS - Full-Stack Application

A modern, production-ready, full-stack Canteen Point-of-Sale (POS), Ordering, and Billing system built with **Node.js + Express**, **SQLite (`better-sqlite3`)**, **PWA (Progressive Web App)**, and **Electron Desktop Application**.

---

## 🌟 Tech Stack Detected & Implemented

- **Frontend**: Clean HTML5, Responsive CSS3 (Warm Modern Terracotta & Mustard theme), Vanilla JavaScript (No heavy bundler overhead, instant page loads).
- **Backend**: Node.js + Express REST API with input validation, JWT authentication, bcrypt password hashing, and centralized error handling.
- **Database**: Embedded SQLite using `better-sqlite3` stored at `backend/canteen.db` (Zero database installation required; self-contained, transactional, WAL-mode enabled).
- **Desktop Application**: Electron packaging the entire backend and UI in a dedicated native window.
- **Mobile PWA**: Web App Manifest (`manifest.json`) + Service Worker (`sw.js`) for offline caching and installation on iOS/Android smartphones.

---

## 📁 Project Architecture & Directory Structure

```
Canteen-Billing-System/
├── backend/
│   ├── .env                      # Environment config (PORT=3000, JWT_SECRET)
│   ├── canteen.db                # SQLite database (auto-created & seeded)
│   ├── db.js                     # Schema definitions, WAL mode, migrations, seeds
│   ├── server.js                 # Express server & static asset dispatcher
│   ├── test-api.js               # Comprehensive 14-point API test suite
│   ├── test-e2e-scenario.js      # E2E test verifying price update sync to billing
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT verification & role authorization (Admin/Cashier)
│   │   └── errorHandler.js       # Centralized 404 & error handlers
│   └── routes/
│       ├── auth.js               # Login, change-password, session verification
│       ├── items.js              # Menu item CRUD, stock management & pricing
│       ├── categories.js         # Category CRUD operations
│       ├── users.js              # Staff & cashier management, password resets
│       ├── settings.js           # Canteen name, tax %, discount, currency
│       ├── orders.js             # Atomic order placement, stock decrement, history
│       ├── reports.js            # Daily & monthly sales analytics & top items
│       └── backup.js             # Admin database snapshot export & download
├── web/
│   ├── index.html                # Main Billing POS screen with live total & receipt modal
│   ├── login.html                # Staff login & forced initial password change
│   ├── history.html              # Order history, search filters & bill reprint
│   ├── menu-manage.html          # [Admin Only] Manage menu items, prices, stock, sold-out toggle
│   ├── users-manage.html         # [Admin Only] Cashier accounts, password reset, enable/disable
│   ├── reports.html              # [Admin Only] Interactive sales dashboard & canvas charts
│   ├── settings.html             # [Admin Only] Canteen configuration & DB backup export
│   ├── auth-common.js            # Shared client auth, role guards, and navigation header
│   ├── script.js                 # Billing screen state, cart math, and checkout handler
│   ├── style.css                 # Warm Canteen design system & print styles
│   ├── manifest.json             # PWA installation manifest
│   ├── sw.js                     # PWA service worker with offline fallback
│   └── icons/                    # App icons (192x192 and 512x512)
├── electron/
│   └── main.js                   # Electron main process (auto-boots backend + desktop window)
├── package.json                  # Root scripts & electron-builder configuration
├── start-web.bat                 # One-click Windows launcher for Web POS
├── start-desktop.bat             # One-click Windows launcher for Electron Desktop POS
└── README.md                     # Complete documentation & usage guide
```

---

## 🔑 Default Credentials

| Role | Username | Initial Password | Notes |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | **Must change password on first login** (enforced by UI & API) |
| **Cashier** | `cashier1` | `cashier123` | Direct access to Billing POS & History |

---

## 🚀 Quick Start Guide

### 1. Run Everything (Web POS)
Start the complete full-stack application with a single command from the project root:
```bash
npm start
```
Or double-click **`start-web.bat`** on Windows.
Open your browser at: **`http://localhost:3000/`**

### 2. Run as Native Desktop App (Electron)
To launch the desktop application in its own native window:
```bash
npm run electron
```
Or double-click **`start-desktop.bat`** on Windows.
The desktop window will open automatically once the local backend is ready.

### 3. Build Installable Executable (`.exe`)
To package the desktop application into a standalone Windows installer:
```bash
npm run build
```
The installable setup and portable binaries will be generated inside the `dist/` directory.

### 4. Run Automated Test Suite
To execute the comprehensive automated test suite verifying all 14 REST endpoints, stock rejections, and live price synchronization:
```bash
npm test
```

---

## 🛠️ Step-by-Step Admin Usage Workflows

### How an Admin Changes Menu Prices & Stock
1. Log in with **`admin`** credentials.
2. In the top navigation bar, click on **📋 Manage Menu** (URL: `/menu-manage.html`).
3. In the items table:
   - **Quick Price Change**: Type the new price into the price box and click the **💾** icon next to it.
   - **Quick Stock Replenish**: Type the new stock number into the stock box and click **💾**.
   - **Sold Out / Available Toggle**: Flip the toggle switch to immediately mark an item available or unavailable.
   - **Full Edit**: Click the **✏️ Edit** button to edit item name, category, price, and stock in a modal.
4. **Instant Sync**: Open the **🍽️ Billing** screen. The updated price, refreshed stock, or "Sold Out" badge appears immediately without restarting the server!

### How an Admin Creates Cashiers & Resets Passwords
1. Go to **👥 Manage Users** (URL: `/users-manage.html`).
2. Click **➕ Create New User**.
3. Enter the cashier username, initial password (min 6 characters), and select the **Cashier** role.
4. Click **Create Account**. The cashier can now log in immediately.
5. To reset any forgotten staff password, click **🔑 Reset Pwd** in the table row and provide a new password.
6. To deactivate a staff member, click **Disable** (the user is instantly blocked from future logins).

### How to View Sales Analytics & Reports
1. Go to **📊 Sales Reports** (URL: `/reports.html`).
2. Toggle between **📅 Daily Report** and **📆 Monthly Report**.
3. View high-level cards:
   - **Total Revenue**
   - **Total Orders / Bills**
   - **Average Bill Value**
   - **Tax Collected**
4. View the **Interactive Visual Chart** showing sales trends over hours of the day or days of the month.
5. Review **Top Selling Menu Items** and the **Payment Method Breakdown** (Cash, UPI, Card).

### How to Export a Database Backup
1. Go to **⚙️ Settings** (URL: `/settings.html`).
2. Scroll to the **Database Backup & Export** section.
3. Click **📥 Download Database Backup (.db)**.
4. A full binary snapshot of `backend/canteen.db` is immediately downloaded to your machine with a timestamped filename (e.g. `canteen_backup_2026-11-10.db`).

---

## 📱 Mobile PWA Installation Guide

The application is fully PWA-enabled with a Web App Manifest and Service Worker:
1. Open Chrome/Safari on your mobile device and navigate to the canteen's local IP address (e.g. `http://192.168.1.50:3000`).
2. Tap the browser menu (**⋮** or Share button) and select **"Add to Home Screen"** or **"Install App"**.
3. The Canteen POS icon will appear on your phone home screen and open in full-screen standalone mode without browser bars.

---

## 🌐 Complete REST API Documentation

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticates username & password, returns JWT token & user object |
| `POST` | `/api/auth/change-password` | Authenticated | Updates password & clears `must_change_password` flag |
| `GET` | `/api/auth/me` | Authenticated | Returns current authenticated user details |

### Menu Items (`/api/items`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/items` | Public / Staff | Returns all menu items with category names, prices, and stock |
| `GET` | `/api/items/:id` | Public / Staff | Returns a single item by ID |
| `POST` | `/api/items` | Admin Only | Creates a new menu item |
| `PUT` | `/api/items/:id` | Admin Only | Updates price, stock, name, category, or availability |
| `DELETE` | `/api/items/:id` | Admin Only | Deletes unused items or deactivates ordered items safely |

### Categories (`/api/categories`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/categories` | Public / Staff | Returns all categories with item counts |
| `POST` | `/api/categories` | Admin Only | Creates a new category |
| `PUT` | `/api/categories/:id` | Admin Only | Updates a category name |
| `DELETE` | `/api/categories/:id` | Admin Only | Deletes category (fails if items exist in category) |

### Orders & Billing (`/api/orders`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/orders` | Staff | Creates order atomically: checks stock, reduces inventory, generates sequential `BILL-YYYYMMDD-XXXX` |
| `GET` | `/api/orders` | Staff | Returns order history with filters (`date_from`, `date_to`, `cashier_id`, `payment_method`, `q`) |
| `GET` | `/api/orders/:id` | Staff | Returns full order details and itemized breakdown for receipt reprinting |

### Reports & Analytics (`/api/reports`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/reports/daily?date=YYYY-MM-DD` | Staff | Daily sales summary, hourly trend, top items, payment split |
| `GET` | `/api/reports/monthly?month=YYYY-MM` | Staff | Monthly totals, daily trend data for charts, top items |

### System Settings & Backup (`/api/settings`, `/api/backup`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/settings` | Public / Staff | Returns canteen name, tax rate %, discount, and currency symbol |
| `PUT` | `/api/settings` | Admin Only | Updates canteen configuration settings |
| `GET` | `/api/backup` | Admin Only | Streams the full `canteen.db` SQLite database file as an attachment |

---

## 🔒 Security & Access Control

- **Role-Based Access Control (RBAC)**: All administrative endpoints (`/api/users/*`, `POST/PUT/DELETE /api/items`, `PUT /api/settings`, `/api/backup`) enforce both backend token checks (`requireAdmin`) and client-side page guards (`Auth.protectPage({ adminOnly: true })`).
- **Cashier Isolation**: Cashiers accessing administrative URLs are immediately redirected with an "Access Denied" notice and cannot execute admin mutations.
- **Forced Password Change**: Default admin credentials trigger an unclosable password change modal on first login requiring a new 6+ character password before continuing.
- **Atomic Inventory Guarantees**: Order checkout uses SQLite transactions (`db.transaction`). If any item lacks sufficient stock, the entire transaction is rolled back and an explanatory 400 error is returned with available quantity.
