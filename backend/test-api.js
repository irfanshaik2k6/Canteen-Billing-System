const http = require('http');
const { app } = require('./server');

let server;
let baseUrl;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = {};
    let postData = null;

    if (body) {
      postData = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Comprehensive API Test Suite ---');

  // Ensure fresh idempotent state for admin user
  const { db } = require('./db');
  const bcrypt = require('bcryptjs');
  db.prepare("UPDATE users SET password_hash = ?, must_change_password = 1 WHERE username = 'admin'").run(
    bcrypt.hashSync('admin123', 10)
  );

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
  console.log(`Test server running at ${baseUrl}`);

  try {
    // 1. Admin Login
    console.log('\n[1] Testing Admin Login...');
    let res = await request('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
    if (res.status !== 200) throw new Error(`Admin login failed: ${JSON.stringify(res.body)}`);
    console.log('✓ Admin login successful. Token received.');
    let adminToken = res.body.token;
    console.log(`✓ Admin must_change_password: ${res.body.user.must_change_password}`);

    // 2. Change Admin Password
    console.log('\n[2] Testing Change Password...');
    res = await request('POST', '/api/auth/change-password', {
      old_password: 'admin123',
      new_password: 'adminSecurePassword123'
    }, adminToken);
    if (res.status !== 200) throw new Error(`Change password failed: ${JSON.stringify(res.body)}`);
    console.log('✓ Password changed successfully.');

    // 2b. Re-login with new password
    res = await request('POST', '/api/auth/login', { username: 'admin', password: 'adminSecurePassword123' });
    if (res.status !== 200) throw new Error(`Re-login failed: ${JSON.stringify(res.body)}`);
    adminToken = res.body.token;
    if (res.body.user.must_change_password !== false) throw new Error('must_change_password should be false after password change!');
    console.log('✓ Re-login verified, must_change_password is now false.');

    // 3. Cashier Login
    console.log('\n[3] Testing Cashier Login...');
    res = await request('POST', '/api/auth/login', { username: 'cashier1', password: 'cashier123' });
    if (res.status !== 200) throw new Error(`Cashier login failed: ${JSON.stringify(res.body)}`);
    const cashierToken = res.body.token;
    console.log('✓ Cashier login successful.');

    // 4. Role-based access check: Cashier cannot create item
    console.log('\n[4] Testing Role-based Access (Cashier attempting admin action)...');
    res = await request('POST', '/api/items', {
      name: 'Hacker Dish',
      category_id: 1,
      price: 99,
      stock: 10
    }, cashierToken);
    if (res.status !== 403) throw new Error(`Expected 403 Forbidden for cashier creating item, got ${res.status}`);
    console.log('✓ Cashier blocked with 403 Forbidden as expected.');

    // 5. Menu Items List
    console.log('\n[5] Testing GET /api/items...');
    res = await request('GET', '/api/items');
    if (res.status !== 200 || !Array.isArray(res.body) || res.body.length < 9) {
      throw new Error(`Expected >= 9 items, got ${JSON.stringify(res.body)}`);
    }
    console.log(`✓ Fetched ${res.body.length} menu items.`);
    const firstItem = res.body[0];

    // 6. Manage Menu: Admin updates price and stock
    console.log(`\n[6] Testing Admin Item Update (item: ${firstItem.name})...`);
    const originalPrice = firstItem.price;
    const testNewPrice = originalPrice + 5.50;
    res = await request('PUT', `/api/items/${firstItem.id}`, {
      price: testNewPrice,
      stock: 80
    }, adminToken);
    if (res.status !== 200) throw new Error(`Item update failed: ${JSON.stringify(res.body)}`);
    console.log(`✓ Updated price from ${originalPrice} to ${testNewPrice}, stock to 80.`);

    // Verify GET /api/items reflects updated price immediately
    res = await request('GET', '/api/items');
    const updatedCheck = res.body.find(i => i.id === firstItem.id);
    if (updatedCheck.price !== testNewPrice) throw new Error(`Price not updated! Expected ${testNewPrice}, got ${updatedCheck.price}`);
    console.log('✓ Verified GET /api/items immediately returns new updated price!');

    // 7. Order Placement (Stock Reduction & Bill Calculation)
    console.log('\n[7] Testing Order Creation (POST /api/orders)...');
    const orderPayload = {
      customer_name: 'Test Customer',
      customer_phone: '9988776655',
      payment_method: 'UPI',
      discount: 5,
      items: [
        { itemId: firstItem.id, quantity: 2 }
      ]
    };
    res = await request('POST', '/api/orders', orderPayload, cashierToken);
    if (res.status !== 201) throw new Error(`Order placement failed: ${JSON.stringify(res.body)}`);
    console.log(`✓ Order placed successfully! Bill No: ${res.body.bill_no}, Total: ${res.body.total}`);
    const createdOrderId = res.body.id;

    // Verify stock reduced by 2 (80 - 2 = 78)
    res = await request('GET', `/api/items/${firstItem.id}`);
    if (res.body.stock !== 78) throw new Error(`Expected stock 78, got ${res.body.stock}`);
    console.log('✓ Verified stock was decremented accurately to 78.');

    // 8. Reject order if stock insufficient
    console.log('\n[8] Testing Insufficient Stock Rejection...');
    res = await request('POST', '/api/orders', {
      customer_name: 'Greedy Customer',
      customer_phone: '9988776655',
      payment_method: 'Cash',
      items: [
        { itemId: firstItem.id, quantity: 9999 } // far exceeds 78
      ]
    }, cashierToken);
    if (res.status !== 400) throw new Error(`Expected 400 for excessive quantity, got ${res.status}`);
    console.log(`✓ Order properly rejected: "${res.body.error}"`);

    // 9. Order History
    console.log('\n[9] Testing Order History (GET /api/orders)...');
    res = await request('GET', '/api/orders?payment_method=UPI', null, cashierToken);
    if (res.status !== 200 || !Array.isArray(res.body) || res.body.length === 0) {
      throw new Error(`Order history failed: ${JSON.stringify(res.body)}`);
    }
    console.log(`✓ Fetched order history with UPI filter: ${res.body.length} orders found.`);

    // 10. Single Order Details (for Reprint)
    console.log('\n[10] Testing Single Order Details (Reprint API)...');
    res = await request('GET', `/api/orders/${createdOrderId}`);
    if (res.status !== 200 || !res.body.items || res.body.items.length === 0) {
      throw new Error(`Single order fetch failed: ${JSON.stringify(res.body)}`);
    }
    console.log(`✓ Single order fetched: ${res.body.bill_no} with ${res.body.items.length} items.`);

    // 11. Daily and Monthly Reports
    console.log('\n[11] Testing Sales Reports (Daily & Monthly)...');
    res = await request('GET', '/api/reports/daily', null, adminToken);
    if (res.status !== 200 || !res.body.summary) throw new Error(`Daily report failed: ${JSON.stringify(res.body)}`);
    console.log(`✓ Daily report: ${res.body.summary.bills_count} bills, Sales: ${res.body.summary.total_sales}`);

    res = await request('GET', '/api/reports/monthly', null, adminToken);
    if (res.status !== 200 || !res.body.summary) throw new Error(`Monthly report failed: ${JSON.stringify(res.body)}`);
    console.log(`✓ Monthly report: ${res.body.summary.bills_count} bills, Sales: ${res.body.summary.total_sales}`);

    // 12. Settings
    console.log('\n[12] Testing Settings API (GET / PUT)...');
    res = await request('GET', '/api/settings');
    if (res.status !== 200 || !res.body.canteen_name) throw new Error(`Get settings failed: ${JSON.stringify(res.body)}`);
    console.log(`✓ Current canteen name: "${res.body.canteen_name}"`);

    res = await request('PUT', '/api/settings', { canteen_name: 'Antigravity Gourmet Canteen', tax_percent: 5 }, adminToken);
    if (res.status !== 200 || res.body.settings.canteen_name !== 'Antigravity Gourmet Canteen') {
      throw new Error(`Update settings failed: ${JSON.stringify(res.body)}`);
    }
    console.log(`✓ Settings updated to: "${res.body.settings.canteen_name}"`);

    // 13. User Management
    console.log('\n[13] Testing User Management (CRUD)...');
    const testUsername = `cashier_test_${Date.now()}`;
    res = await request('POST', '/api/users', {
      username: testUsername,
      password: 'cashierPassword2',
      role: 'cashier',
      is_active: 1
    }, adminToken);
    if (res.status !== 201) throw new Error(`Create user failed: ${JSON.stringify(res.body)}`);
    const newUserId = res.body.user.id;
    console.log(`✓ Created user "${res.body.user.username}" (ID: ${newUserId}).`);

    // Disable user
    res = await request('PUT', `/api/users/${newUserId}`, { is_active: false }, adminToken);
    if (res.status !== 200 || res.body.user.is_active !== 0) throw new Error(`Disable user failed: ${JSON.stringify(res.body)}`);
    console.log(`✓ Disabled ${testUsername} account.`);

    // Test disabled user login fails
    res = await request('POST', '/api/auth/login', { username: testUsername, password: 'cashierPassword2' });
    if (res.status !== 403) throw new Error(`Expected 403 for disabled user, got ${res.status}`);
    console.log('✓ Disabled user login properly blocked (403 Forbidden).');

    // 14. Database Backup Endpoint
    console.log('\n[14] Testing Database Backup (GET /api/backup)...');
    res = await request('GET', '/api/backup', null, adminToken);
    if (res.status !== 200) throw new Error(`Backup failed with status ${res.status}`);
    console.log('✓ Database backup file returned successfully.');

    // Reset admin password back to admin123 and must_change_password to 1 so fresh user sees initial state
    const { db } = require('./db');
    const bcrypt = require('bcryptjs');
    db.prepare("UPDATE users SET password_hash = ?, must_change_password = 1 WHERE username = 'admin'").run(
      bcrypt.hashSync('admin123', 10)
    );
    console.log('✓ Reset admin credentials back to default (admin / admin123 with must_change_password = 1).');

    console.log('\n===============================================');
    console.log('🎉 ALL 14 BACKEND API TESTS PASSED PERFECTLY! 🎉');
    console.log('===============================================');
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  if (server) server.close();
  process.exit(1);
});
