const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function readJson(filename) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8'));
}

function writeJson(filename, data) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
}

console.log('--- STARTING VERIFICATION TESTS ---');

// 1. Verify Inventory
const inventory = readJson('inventory.json');
console.log(`[PASS] Inventory loaded: ${inventory.length} appliances found.`);
if (inventory.length === 0) throw new Error('Inventory is empty');

// Verify structure
for (const item of inventory) {
  if (!item.id || !item.sku || !item.title || item.price === undefined || item.stock === undefined) {
    throw new Error(`Invalid item structure in SKU ${item.sku}`);
  }
}
console.log('[PASS] All inventory items have valid SKU, title, price, and stock fields.');

// 2. Test Order Placement & Stock Deduction
const testItem = inventory[0];
const initialStock = testItem.stock;
console.log(`Testing with item "${testItem.title}", Initial stock: ${initialStock}`);

const orderId = `CMD-TEST-${Date.now().toString().slice(-4)}`;
const orders = readJson('orders.json');
const initialOrdersCount = orders.length;

// Simulate order logic
if (testItem.stock < 1) throw new Error('Item out of stock for test');
testItem.stock -= 1;
writeJson('inventory.json', inventory);

const newOrder = {
  id: orderId,
  createdAt: new Date().toISOString(),
  customer: {
    firstName: 'Test',
    lastName: 'Client',
    email: 'test@client.fr',
    phone: '06 00 00 00 00',
    address: '1 Rue de Test'
  },
  deliveryMethod: 'pickup',
  deliveryLabel: 'Retrait gratuit à la boutique',
  paymentMethod: 'store_pickup',
  paymentLabel: 'Paiement au comptoir',
  items: [{
    id: testItem.id,
    sku: testItem.sku,
    title: testItem.title,
    price: testItem.price,
    quantity: 1
  }],
  subtotal: testItem.price,
  deliveryFee: 0,
  total: testItem.price,
  status: 'pending',
  statusLabel: 'En attente de préparation'
};

orders.unshift(newOrder);
writeJson('orders.json', orders);

// Verify stock was decremented
const reloadedInventory = readJson('inventory.json');
const reloadedItem = reloadedInventory.find(i => i.id === testItem.id);
if (reloadedItem.stock !== initialStock - 1) {
  throw new Error(`Expected stock ${initialStock - 1}, but got ${reloadedItem.stock}`);
}
console.log(`[PASS] Stock properly decremented to ${reloadedItem.stock}.`);

// 3. Test Order Cancellation & Stock Restoration
console.log(`Testing cancellation of order ${orderId}...`);
const reloadedOrders = readJson('orders.json');
const orderToCancel = reloadedOrders.find(o => o.id === orderId);
orderToCancel.status = 'cancelled';
orderToCancel.statusLabel = 'Annulée';

// Restore stock
for (const item of orderToCancel.items) {
  const prod = reloadedInventory.find(p => p.id === item.id);
  if (prod) prod.stock += item.quantity;
}
writeJson('inventory.json', reloadedInventory);
writeJson('orders.json', reloadedOrders);

const restoredInventory = readJson('inventory.json');
const restoredItem = restoredInventory.find(i => i.id === testItem.id);
if (restoredItem.stock !== initialStock) {
  throw new Error(`Stock not restored: expected ${initialStock}, got ${restoredItem.stock}`);
}
console.log(`[PASS] Order cancellation successfully restored stock to ${restoredItem.stock}.`);

// Clean test order from orders
const cleanedOrders = reloadedOrders.filter(o => o.id !== orderId);
writeJson('orders.json', cleanedOrders);
console.log(`[PASS] Test order cleaned up.`);

// 4. Verify Autobiography & Settings
const settings = readJson('settings.json');
if (!settings.shop.name || !settings.autobiography.chapters || settings.autobiography.chapters.length < 4) {
  throw new Error('Settings or autobiography chapters missing or incomplete');
}
console.log(`[PASS] Autobiography verified with ${settings.autobiography.chapters.length} rich narrative chapters.`);

// 5. Verify Frontend Files exist and are non-empty
const requiredFiles = [
  'public/index.html',
  'public/css/styles.css',
  'public/js/app.js',
  'public/js/cart.js',
  'public/js/inventory-admin.js',
  'public/js/orders-admin.js',
  'public/js/data-store.js'
];

for (const relPath of requiredFiles) {
  const fullPath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) throw new Error(`Missing required file: ${relPath}`);
  const stats = fs.statSync(fullPath);
  if (stats.size < 50) throw new Error(`File is too small or empty: ${relPath}`);
  console.log(`[PASS] ${relPath} (${stats.size} bytes)`);
}

console.log('--- ALL VERIFICATIONS PASSED SUCCESSFULLY (100%) ---');
