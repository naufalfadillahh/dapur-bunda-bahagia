// Mode demo untuk Vercel: meniru API server.js tanpa MySQL.
// Data awal diambil dari dapur_bunda_backup.sql. Perubahan disimpan di memori
// dan akan kembali ke data awal sewaktu-waktu (setiap kali fungsi dimulai ulang).

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * DAY).toISOString();

const products = [
  { id: 1, name: 'Nasi Goreng', price: 25000, category: 'Makanan', stock_quantity: 10, image_path: 'ASET/nasgor.avif' },
  { id: 2, name: 'Ayam Bakar', price: 30000, category: 'Makanan', stock_quantity: 14, image_path: 'ASET/ayambakar.jpg' },
  { id: 3, name: 'Es Teh', price: 5000, category: 'Minuman', stock_quantity: 19, image_path: 'ASET/esteh.webp' },
  { id: 4, name: 'Mie Goreng', price: 22000, category: 'Makanan', stock_quantity: 12, image_path: 'ASET/miegoreng.jpeg' },
  { id: 5, name: 'Kentang Goreng', price: 15000, category: 'Appetizer', stock_quantity: 10, image_path: 'ASET/kentanggoreng.jpg' },
  { id: 6, name: 'Jus Jeruk', price: 8000, category: 'Minuman', stock_quantity: 16, image_path: 'ASET/jusjeruk.jpg' },
  { id: 7, name: 'Soto Ayam', price: 20000, category: 'Makanan', stock_quantity: 10, image_path: 'ASET/sotoayam.jpg' },
];

// Pesanan dari backup database, tanggalnya digeser ke beberapa hari terakhir agar laporan terisi.
let orders = [
  { id: 1, total_amount: 31000, payment_method: 'tunai', status: 'completed', created_at: daysAgo(3), items: [{ product_id: 5, quantity: 1, price: 15000 }, { product_id: 6, quantity: 2, price: 8000 }] },
  { id: 2, total_amount: 50000, payment_method: 'tunai', status: 'completed', created_at: daysAgo(3), items: [{ product_id: 5, quantity: 1, price: 15000 }, { product_id: 3, quantity: 1, price: 5000 }, { product_id: 2, quantity: 1, price: 30000 }] },
  { id: 3, total_amount: 75000, payment_method: 'tunai', status: 'completed', created_at: daysAgo(1), items: [{ product_id: 5, quantity: 5, price: 15000 }] },
  { id: 4, total_amount: 15000, payment_method: 'tunai', status: 'completed', created_at: daysAgo(0), items: [{ product_id: 5, quantity: 1, price: 15000 }] },
];
let nextOrderId = 5;

const READ_ONLY = 'Mode demo: tambah, ubah, dan hapus produk dinonaktifkan di versi online.';

function withNames(order) {
  return {
    ...order,
    items: order.items.map((it) => ({ ...it, name: (products.find((p) => p.id === it.product_id) || {}).name })),
  };
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { return {}; }
}

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const path = url.pathname.replace(/\/+$/, '');
  const m = req.method;
  const send = (code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };

  if (path === '/api/products' && m === 'GET') return send(200, products);
  if (path.startsWith('/api/products')) return send(403, { error: READ_ONLY, message: READ_ONLY });

  if (path === '/api/orders' && m === 'GET') {
    return send(200, [...orders].sort((a, b) => b.created_at.localeCompare(a.created_at)).map(withNames));
  }
  if (path === '/api/orders' && m === 'POST') {
    const { items = [], totalAmount, paymentMethod } = await readJson(req);
    const order = {
      id: nextOrderId++, total_amount: totalAmount, payment_method: paymentMethod, status: 'completed',
      created_at: new Date().toISOString(),
      items: items.map((it) => ({ product_id: it.id, quantity: it.quantity || 1, price: it.price })),
    };
    orders.push(order);
    order.items.forEach((it) => { const p = products.find((x) => x.id === it.product_id); if (p) p.stock_quantity -= it.quantity; });
    return send(200, { message: 'Order created and completed', orderId: order.id });
  }
  const done = path.match(/^\/api\/orders\/(\d+)\/complete$/);
  if (done && m === 'PUT') {
    const o = orders.find((x) => x.id === +done[1]);
    if (!o) return send(404, { error: 'Order not found' });
    o.status = 'completed';
    return send(200, { message: 'Order completed and added to report' });
  }

  if (path === '/api/stock' && m === 'PUT') {
    const { id, stock_quantity } = await readJson(req);
    const p = products.find((x) => x.id === +id);
    if (p) p.stock_quantity = +stock_quantity;
    return send(200, { message: 'Stock updated' });
  }

  if (path === '/api/reports' && m === 'GET') {
    const since = Date.now() - (url.searchParams.get('period') === 'week' ? 7 : 30) * DAY;
    const byDate = {};
    orders.filter((o) => o.status === 'completed' && Date.parse(o.created_at) >= since).forEach((o) => {
      const d = o.created_at.slice(0, 10);
      byDate[d] = byDate[d] || { date: d, total_sales: 0, order_count: 0 };
      byDate[d].total_sales += o.total_amount;
      byDate[d].order_count += 1;
    });
    return send(200, Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date)));
  }
  if (path === '/api/reports/reset' && m === 'PUT') {
    orders = [];
    return send(200, { message: 'Reset successful. All orders and items deleted. Reports cleared.' });
  }

  return send(404, { error: 'Not found' });
};
