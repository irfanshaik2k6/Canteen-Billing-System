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

async function verifyPriceChangeReflectsInBilling() {
  console.log('\n======================================================');
  console.log('🧪 VERIFYING: Price changed in Manage Menu appears in Billing');
  console.log('======================================================');

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;

  try {
    // 1. Admin login
    let res = await request('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
    if (res.status !== 200) throw new Error('Admin login failed: ' + JSON.stringify(res.body));
    const adminToken = res.body.token;

    // 2. Fetch current menu (as seen on Billing screen)
    res = await request('GET', '/api/items');
    const teaItem = res.body.find(i => i.name === 'Tea');
    if (!teaItem) throw new Error('Tea item not found in menu');
    console.log(`[Step 1] Current price of Tea on Billing Screen: Rs. ${teaItem.price}`);

    // 3. Admin goes to Manage Menu and updates Tea price to Rs. 28.50
    const newPrice = 28.50;
    console.log(`[Step 2] Admin updates Tea price in Manage Menu to Rs. ${newPrice}...`);
    res = await request('PUT', `/api/items/${teaItem.id}`, {
      name: 'Tea',
      price: newPrice,
      stock: 120,
      is_available: 1
    }, adminToken);
    if (res.status !== 200) throw new Error('Failed to update price in manage menu: ' + JSON.stringify(res.body));
    console.log('✓ Price update saved to database via Admin Manage Menu API.');

    // 4. Cashier opens Billing Screen (calls GET /api/items)
    console.log('[Step 3] Billing screen fetches fresh menu (GET /api/items)...');
    res = await request('GET', '/api/items');
    const updatedTea = res.body.find(i => i.id === teaItem.id);
    console.log(`✓ Fetched price for Tea on Billing Screen: Rs. ${updatedTea.price}`);

    if (updatedTea.price !== newPrice) {
      throw new Error(`FAILURE: Price did not reflect in billing! Expected ${newPrice}, got ${updatedTea.price}`);
    }
    console.log('✓ CONFIRMED: Changed price appears instantly in billing screen data!');

    // 5. Cashier creates order with Tea at the new price
    console.log('[Step 4] Cashier creates order for 2 cups of Tea...');
    res = await request('POST', '/api/auth/login', { username: 'cashier1', password: 'cashier123' });
    const cashierToken = res.body.token;

    const orderRes = await request('POST', '/api/orders', {
      customer_name: 'Anand Kumar',
      customer_phone: '9876543210',
      payment_method: 'Cash',
      items: [{ itemId: teaItem.id, quantity: 2 }]
    }, cashierToken);

    if (orderRes.status !== 201) throw new Error('Order creation failed: ' + JSON.stringify(orderRes.body));
    const bill = orderRes.body;
    console.log(`✓ Bill generated: #${bill.bill_no}`);
    console.log(`  Items on Bill: ${bill.items[0].name} (Qty: ${bill.items[0].quantity}, Rate: Rs. ${bill.items[0].price}, Line: Rs. ${bill.items[0].amount})`);
    console.log(`  Subtotal: Rs. ${bill.subtotal}`);
    console.log(`  Tax: Rs. ${bill.tax}`);
    console.log(`  Grand Total: Rs. ${bill.total}`);

    if (bill.items[0].price !== newPrice) {
      throw new Error(`FAILURE: Bill generated with incorrect rate! Expected ${newPrice}, got ${bill.items[0].price}`);
    }

    const expectedSubtotal = newPrice * 2; // 57.00
    if (bill.subtotal !== expectedSubtotal) {
      throw new Error(`FAILURE: Subtotal mismatch! Expected ${expectedSubtotal}, got ${bill.subtotal}`);
    }

    console.log('✓ CONFIRMED: Bill calculation matches the updated price perfectly!');

    // Revert Tea price back to 15.00 for clean default state
    await request('PUT', `/api/items/${teaItem.id}`, { price: 15.00, stock: 100 }, adminToken);
    console.log('✓ Tea price reset to default Rs. 15.00 for clean slate.');

    console.log('\n======================================================');
    console.log('✅ TEST PASSED: MANAGE MENU PRICE CHANGE REFLECTS IN BILLING!');
    console.log('======================================================\n');
  } finally {
    server.close();
  }
}

verifyPriceChangeReflectsInBilling().catch(err => {
  console.error('\n❌ E2E TEST FAILED:', err);
  if (server) server.close();
  process.exit(1);
});

